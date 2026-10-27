use lifecycle_api::{config::Config, router, state::AppState};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> std::process::ExitCode {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("lifecycle_api=info,tower_http=info")),
        )
        .init();
    if let Err(message) = run().await {
        tracing::error!(message, "Application startup failed");
        return std::process::ExitCode::FAILURE;
    }
    std::process::ExitCode::SUCCESS
}

async fn run() -> Result<(), String> {
    let config = Config::from_env()?;
    let state = AppState::lazy(&config).map_err(str::to_owned)?;
    state
        .migrate()
        .await
        .map_err(|_| "Database connection or migration failed".to_owned())?;
    let listener = tokio::net::TcpListener::bind(config.bind)
        .await
        .map_err(|_| "Cannot bind application listener".to_owned())?;
    tracing::info!(address = %config.bind, "API listening");
    axum::serve(
        listener,
        router(state.clone()).into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown())
    .await
    .map_err(|_| "HTTP server failed".to_owned())?;
    state.database.close().await;
    Ok(())
}

async fn shutdown() {
    let interrupt = async {
        if let Err(error) = tokio::signal::ctrl_c().await {
            tracing::error!(%error, "Cannot install interrupt handler");
        }
    };
    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(error) => tracing::error!(%error, "Cannot install termination handler"),
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        () = interrupt => {},
        () = terminate => {},
    }
}
