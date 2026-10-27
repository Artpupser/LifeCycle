use crate::{config::Config, error::ApiError};
use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor, message::header::ContentType,
    transport::smtp::authentication::Credentials,
};
use std::time::Duration;

pub fn transport(config: &Config) -> Result<AsyncSmtpTransport<Tokio1Executor>, &'static str> {
    let builder = match config.smtp_tls.as_str() {
        "tls" => AsyncSmtpTransport::<Tokio1Executor>::relay(&config.smtp_host)
            .map_err(|_| "SMTP TLS configuration is invalid")?,
        "starttls" => AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.smtp_host)
            .map_err(|_| "SMTP TLS configuration is invalid")?,
        _ => AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&config.smtp_host),
    };
    let mut builder = builder
        .port(config.smtp_port)
        .timeout(Some(Duration::from_secs(5)));
    if !config.smtp_username.is_empty() {
        builder = builder.credentials(Credentials::new(
            config.smtp_username.clone(),
            config.smtp_password.clone(),
        ));
    }
    Ok(builder.build())
}

pub async fn send_code(
    mailer: &AsyncSmtpTransport<Tokio1Executor>,
    config: &Config,
    email: &str,
    code: &str,
) -> Result<(), ApiError> {
    let message=Message::builder()
        .from(config.smtp_from.parse().map_err(|_|ApiError::internal())?)
        .to(email.parse().map_err(|_|ApiError::validation("Invalid email address"))?)
        .subject("LifeCycle: код входа")
        .header(ContentType::TEXT_PLAIN)
        .body(format!("Ваш код входа в LifeCycle: {code}\n\nКод действует 10 минут. Если вы не запрашивали вход, проигнорируйте письмо."))
        .map_err(|_|ApiError::internal())?;
    tokio::time::timeout(Duration::from_secs(6), mailer.send(message))
        .await
        .map_err(|_| unavailable())?
        .map_err(|_| unavailable())?;
    Ok(())
}

fn unavailable() -> ApiError {
    ApiError {
        status: axum::http::StatusCode::SERVICE_UNAVAILABLE,
        code: "mail_unavailable",
        message: "Verification email could not be delivered",
        retry_after: None,
    }
}
