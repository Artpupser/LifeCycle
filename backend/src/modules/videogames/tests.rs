use super::{models, providers};
#[test]
fn official_steam_deals_cover_the_full_discount_range_without_resellers() {
    let data = serde_json::json!({"specials":{"items":[
    {"id":400,"type":0,"name":"Portal","original_price":10000,"final_price":8000,"currency":"USD","header_image":"https://cdn.akamai.steamstatic.com/a.jpg"},
    {"id":401,"type":0,"name":"Free game","original_price":10000,"final_price":0,"currency":"USD"},
    {"id":402,"type":1,"name":"DLC","original_price":10000,"final_price":1000,"currency":"USD"},
    {"id":403,"type":0,"name":"Regular price","original_price":10000,"final_price":10000,"currency":"USD"}
    ]}});
    let rows = providers::steam_discounts(&data);
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].discount_basis_points, 2000);
    assert_eq!(rows[0].price, "80.00");
    assert!(rows[1].free);
    assert!(rows.iter().all(providers::official_offer));
    let mut reseller = rows[0].clone();
    reseller.claim_url = "https://www.cheapshark.com/redirect".into();
    assert!(!providers::official_offer(&reseller));
    reseller = rows[0].clone();
    reseller.platform = "epic".into();
    assert!(!providers::official_offer(&reseller));
}
#[test]
fn integration_external_offers_never_accept_credential_urls_or_spoofed_stores() {
    for url in [
        "https://store.steampowered.com/app/10/",
        "https://store.epicgames.com/p/example",
        "https://studio.itch.io/game",
    ] {
        assert!(providers::safe_offer_url(url).is_some());
    }
    for url in [
        "javascript:alert(1)",
        "http://store.steampowered.com/app/10/",
        "https://store.steampowered.com.evil.test/game",
        "https://attacker@store.steampowered.com/app/10/",
        "https://localhost/game",
        "https://www.gamerpower.com/game/",
        "https://www.cheapshark.com/redirect",
    ] {
        assert!(providers::safe_offer_url(url).is_none());
    }
}
#[test]
fn integration_sales_have_sources_and_stable_owner_scoped_event_identity() {
    let sales = models::sales();
    assert!(!sales.is_empty());
    let user = uuid::Uuid::new_v4();
    for sale in sales {
        assert!(sale.starts_at < sale.ends_at);
        assert!(sale.source.starts_with("https://partner.steamgames.com/"));
        let key = format!("gaming:{}:start", sale.id);
        let id = crate::modules::countdowns::external_id(user, &key);
        assert_eq!(id, crate::modules::countdowns::external_id(user, &key));
        assert_ne!(
            id,
            crate::modules::countdowns::external_id(uuid::Uuid::new_v4(), &key)
        );
    }
}

#[tokio::test]
#[ignore = "requires an isolated PostgreSQL database supplied by LIFECYCLE_TEST_DATABASE_URL"]
async fn videogames_database_catalog_and_repeated_calendar_import_use_current_schema() {
    use crate::{config::Config, infrastructure::state::AppState};
    use axum::{
        body::{Body, to_bytes},
        http::{Request, StatusCode},
    };
    use sha2::{Digest, Sha256};
    use tower::ServiceExt;
    let database =
        std::env::var("LIFECYCLE_TEST_DATABASE_URL").expect("isolated test database URL");
    let mut values: std::collections::HashMap<String, String> = [
        ("REDIS_URL", "redis://127.0.0.1:1"),
        ("S3_ENDPOINT", "http://127.0.0.1:1"),
        ("S3_BUCKET", "lifecycle"),
        ("S3_REGION", "garage"),
        ("S3_ACCESS_KEY_ID", "test"),
        ("S3_SECRET_ACCESS_KEY", "test"),
        ("APP_PUBLIC_URL", "http://localhost:8081"),
        (
            "AUTH_CODE_SECRET",
            "test-secret-at-least-32-characters-long",
        ),
        (
            "DATA_ENCRYPTION_KEY",
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        ),
        ("SMTP_HOST", "127.0.0.1"),
        ("SMTP_PORT", "1025"),
        ("SMTP_TLS", "none"),
        ("SMTP_FROM", "noreply@localhost"),
    ]
    .into_iter()
    .map(|(key, value)| (key.into(), value.into()))
    .collect();
    values.insert("DATABASE_URL".into(), database);
    values.insert(
        "WEB_PUSH_PRIVATE_KEY".into(),
        "IQ9Ur0ykXoHS9gzfYX0aBjy9lvdrjx_PFUXmie9YRcY".into(),
    );
    let state = AppState::lazy(&Config::from_values(values).unwrap()).unwrap();
    state.migrate().await.unwrap();
    let user = uuid::Uuid::new_v4();
    let token = "a".repeat(43);
    sqlx::query("INSERT INTO app.users(id,email) VALUES($1,'regression@example.test')")
        .bind(user)
        .execute(&state.database)
        .await
        .unwrap();
    sqlx::query("INSERT INTO app.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')").bind(hex::encode(Sha256::digest(token.as_bytes()))).bind(user).execute(&state.database).await.unwrap();
    for source in providers::SOURCES {
        sqlx::query("INSERT INTO app.game_feeds(id,data,last_error,failure_count,retry_at) VALUES($1,'[]',true,2,now()+interval '10 minutes')").bind(source).execute(&state.database).await.unwrap();
    }
    for (key, data) in [
        (
            "steam-sales",
            serde_json::to_value(models::sales()).unwrap(),
        ),
        (
            "epic:US",
            serde_json::json!({"data":{"Catalog":{"searchStore":{"elements":[]}}}}),
        ),
    ] {
        sqlx::query("INSERT INTO app.game_feeds(id,kind,data,last_error,failure_count,retry_at) VALUES($1,'metadata',$2,true,2,now()+interval '10 minutes') ON CONFLICT(id) DO UPDATE SET kind='metadata',data=$2").bind(key).bind(sqlx::types::Json(data)).execute(&state.database).await.unwrap();
    }
    let mut profile = crate::modules::profile::Profile::default();
    profile.residence_country = "RU".into();
    let encrypted = state
        .cipher
        .encrypt(
            &serde_json::to_vec(&profile).unwrap(),
            format!("profile:{user}").as_bytes(),
        )
        .unwrap();
    sqlx::query("INSERT INTO app.profiles(user_id,encrypted_data) VALUES($1,$2)")
        .bind(user)
        .bind(encrypted)
        .execute(&state.database)
        .await
        .unwrap();
    let offer = serde_json::json!({"id":"steam:400","platform":"steam","title":"Portal","app_id":"400","price":"0.99","regular_price":"19.99","currency":"USD","discount_basis_points":9504,"free":false,"url":"https://store.steampowered.com/app/400/","claim_url":"https://store.steampowered.com/app/400/","source":"steam","ends_at":null});
    sqlx::query("UPDATE app.game_feeds SET data=$1 WHERE id='steam'")
        .bind(sqlx::types::Json(serde_json::json!([offer])))
        .execute(&state.database)
        .await
        .unwrap();
    for (key, data) in [
        (
            "steam-prices:RU",
            serde_json::json!({"400":{"success":true,"data":{"price_overview":{"currency":"RUB","initial":100000,"final":9990}}}}),
        ),
        (
            "epic:RU",
            serde_json::json!({"data":{"Catalog":{"searchStore":{"elements":[]}}}}),
        ),
    ] {
        sqlx::query("INSERT INTO app.game_feeds(id,kind,data) VALUES($1,'metadata',$2)")
            .bind(key)
            .bind(sqlx::types::Json(data))
            .execute(&state.database)
            .await
            .unwrap();
    }
    let app = crate::router(state.clone());
    let request = |method: &str, path: String| {
        Request::builder()
            .method(method)
            .uri(path)
            .header("cookie", format!("lifecycle_session={token}"))
            .header("origin", "http://localhost:8081")
            .body(Body::empty())
            .unwrap()
    };
    let result = app
        .clone()
        .oneshot(request("GET", "/api/videogames".into()))
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let market: serde_json::Value =
        serde_json::from_slice(&to_bytes(result.into_body(), 1024 * 1024).await.unwrap()).unwrap();
    assert_eq!(market["country"], "RU");
    assert_eq!(market["offers"][0]["currency"], "RUB");
    assert_eq!(market["offers"][0]["price"], "99.90");
    assert!(
        market["offers"][0]["preview"]
            .as_str()
            .unwrap()
            .starts_with("/api/media/providers/")
    );
    let registered: String =
        sqlx::query_scalar("SELECT source_url FROM app.provider_media WHERE user_id=$1 LIMIT 1")
            .bind(user)
            .fetch_one(&state.database)
            .await
            .unwrap();
    assert_eq!(
        registered,
        "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/400/header.jpg"
    );
    sqlx::query("UPDATE app.game_feeds SET data=jsonb_set(data,'{400,data,price_overview,final}','0') WHERE id='steam-prices:RU'").execute(&state.database).await.unwrap();
    let result = app
        .clone()
        .oneshot(request("GET", "/api/videogames".into()))
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let free: serde_json::Value =
        serde_json::from_slice(&to_bytes(result.into_body(), 1024 * 1024).await.unwrap()).unwrap();
    assert_eq!(free["offers"][0]["free"], true);
    assert_eq!(free["offers"][0]["price"], "0.00");
    sqlx::query("UPDATE app.game_feeds SET data=jsonb_set(data,'{400,data,price_overview,final}','9990') WHERE id='steam-prices:RU'").execute(&state.database).await.unwrap();
    let foreign_user = uuid::Uuid::new_v4();
    let foreign_token = "c".repeat(43);
    sqlx::query("INSERT INTO app.users(id,email) VALUES($1,'image-boundary@example.test')")
        .bind(foreign_user)
        .execute(&state.database)
        .await
        .unwrap();
    sqlx::query("INSERT INTO app.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')").bind(hex::encode(Sha256::digest(foreign_token.as_bytes()))).bind(foreign_user).execute(&state.database).await.unwrap();
    let result = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(market["offers"][0]["preview"].as_str().unwrap())
                .header("cookie", format!("lifecycle_session={foreign_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::NOT_FOUND);
    // Legacy settings remain editable; the new launcher login does not use a custom OAuth client.
    let result=app.clone().oneshot(Request::builder().method("PUT").uri("/api/integrations/epic").header("cookie",format!("lifecycle_session={token}")).header("origin","http://localhost:8081").header("content-type","application/json").body(Body::from(r#"{"instance_id":null,"revision":0,"client_id":"test-epic-client","api_key":"test-epic-secret"}"#)).unwrap()).await.unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let integrations: serde_json::Value =
        serde_json::from_slice(&to_bytes(result.into_body(), 65536).await.unwrap()).unwrap();
    let epic = integrations
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["id"] == "epic")
        .unwrap();
    assert_eq!(epic["configured"], false);
    assert_eq!(epic["connected"], false);
    assert!(
        !serde_json::to_string(&integrations)
            .unwrap()
            .contains("test-epic-secret")
    );
    let result = app
        .clone()
        .oneshot(request("POST", "/api/integrations/epic/connect".into()))
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let connect: serde_json::Value =
        serde_json::from_slice(&to_bytes(result.into_body(), 65536).await.unwrap()).unwrap();
    let url = url::Url::parse(connect["url"].as_str().unwrap()).unwrap();
    assert_eq!(url.host_str(), Some("www.epicgames.com"));
    assert_eq!(url.path(), "/id/login");
    let auth_state = connect["state"].as_str().unwrap().to_owned();
    let attempts:i64=sqlx::query_scalar("SELECT count(*) FROM app.integration_auth_attempts WHERE provider='epic' AND user_id=$1 AND token_hash=$2").bind(user).bind(hex::encode(Sha256::digest(auth_state.as_bytes()))).fetch_one(&state.database).await.unwrap();
    assert_eq!(attempts, 1);
    // A different session cannot redeem this user's state; no provider request is made.
    let other_token = "b".repeat(43);
    sqlx::query("INSERT INTO app.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')").bind(hex::encode(Sha256::digest(other_token.as_bytes()))).bind(user).execute(&state.database).await.unwrap();
    let result=app.clone().oneshot(Request::builder().method("POST").uri("/api/integrations/epic/authorize").header("cookie",format!("lifecycle_session={other_token}")).header("origin","http://localhost:8081").header("content-type","application/json").body(Body::from(serde_json::json!({"state":auth_state,"code":"0123456789abcdef0123456789abcdef"}).to_string())).unwrap()).await.unwrap();
    assert_eq!(result.status(), StatusCode::BAD_REQUEST);
    let calls = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let shared = calls.clone();
    let mock=axum::Router::new().route("/token",axum::routing::post(move ||{let calls=shared.clone();async move{calls.fetch_add(1,std::sync::atomic::Ordering::SeqCst);axum::Json(serde_json::json!({"account_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","access_token":"private-access-token","refresh_token":"private-refresh-token","expires_in":3600,"displayName":"Player"}))}}));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let endpoint = format!("http://{}/token", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, mock).await.unwrap();
    });
    let current = crate::shared::auth::CurrentUser {
        id: user,
        email: "regression@example.test".into(),
    };
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        "cookie",
        format!("lifecycle_session={token}").parse().unwrap(),
    );
    crate::modules::integrations::test_finish_epic(
        &state,
        &current,
        &headers,
        crate::modules::integrations::CodeInput {
            state: auth_state.clone(),
            code: "0123456789abcdef0123456789abcdef".into(),
        },
        &endpoint,
    )
    .await
    .unwrap();
    assert!(
        crate::modules::integrations::test_finish_epic(
            &state,
            &current,
            &headers,
            crate::modules::integrations::CodeInput {
                state: auth_state,
                code: "0123456789abcdef0123456789abcdef".into()
            },
            &endpoint
        )
        .await
        .is_err()
    );
    assert_eq!(calls.load(std::sync::atomic::Ordering::SeqCst), 1);
    let result = app
        .clone()
        .oneshot(request("GET", "/api/integrations".into()))
        .await
        .unwrap();
    let public: serde_json::Value =
        serde_json::from_slice(&to_bytes(result.into_body(), 65536).await.unwrap()).unwrap();
    let serialized = public.to_string();
    assert!(
        !serialized.contains("private-access-token")
            && !serialized.contains("private-refresh-token")
            && !serialized.contains("test-epic-secret")
    );
    let epic = public
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["id"] == "epic")
        .unwrap();
    assert_eq!(epic["connected"], true);
    assert_eq!(epic["configured"], true);
    assert_eq!(epic["syncing"], false);
    assert!(epic["last_synced_at"].is_null());
    sqlx::query("UPDATE app.integrations SET failure_count=2,retry_at=now()+interval '10 minutes',last_error='unavailable' WHERE user_id=$1 AND provider='epic'").bind(user).execute(&state.database).await.unwrap();
    let edited = serde_json::json!({"instance_id":epic["instance_id"],"revision":epic["revision"],"client_id":"edited-local-client","api_key":"edited-local-secret"});
    let result = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/integrations/epic")
                .header("cookie", format!("lifecycle_session={token}"))
                .header("origin", "http://localhost:8081")
                .header("content-type", "application/json")
                .body(Body::from(edited.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let paused: bool = sqlx::query_scalar(
        "SELECT retry_at>now() FROM app.integrations WHERE user_id=$1 AND provider='epic'",
    )
    .bind(user)
    .fetch_one(&state.database)
    .await
    .unwrap();
    assert!(paused, "Local edits must preserve the provider's pause");
    let result = app
        .clone()
        .oneshot(request("POST", "/api/integrations/epic/connect".into()))
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::TOO_MANY_REQUESTS);
    server.abort();
    let sale = models::sales()
        .into_iter()
        .find(|sale| sale.ends_at > chrono::Utc::now())
        .unwrap();
    let route = format!("/api/videogames/sales/{}/calendar", sale.id);
    for _ in 0..2 {
        let result = app
            .clone()
            .oneshot(request("POST", route.clone()))
            .await
            .unwrap();
        assert_eq!(result.status(), StatusCode::OK);
    }
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM app.countdowns WHERE user_id=$1")
        .bind(user)
        .fetch_one(&state.database)
        .await
        .unwrap();
    assert_eq!(count, 2);
    let result = app
        .clone()
        .oneshot(request("GET", "/api/videogames".into()))
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let body: serde_json::Value =
        serde_json::from_slice(&to_bytes(result.into_body(), 1024 * 1024).await.unwrap()).unwrap();
    assert!(
        body["calendar_sales"]
            .as_array()
            .unwrap()
            .iter()
            .any(|id| id == &sale.id)
    );
    let id = crate::modules::countdowns::external_id(user, &format!("gaming:{}:start", sale.id));
    let result = app
        .clone()
        .oneshot(request("DELETE", format!("/api/countdowns/{id}")))
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::NO_CONTENT);
    let result = app.clone().oneshot(request("POST", route)).await.unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let before: Vec<(String, chrono::DateTime<chrono::Utc>, i32)> =
        sqlx::query_as("SELECT id,checked_at,failure_count FROM app.game_feeds ORDER BY id")
            .fetch_all(&state.database)
            .await
            .unwrap();
    let result = app
        .oneshot(request("POST", "/api/videogames/refresh".into()))
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::OK);
    let after: Vec<(String, chrono::DateTime<chrono::Utc>, i32)> =
        sqlx::query_as("SELECT id,checked_at,failure_count FROM app.game_feeds ORDER BY id")
            .fetch_all(&state.database)
            .await
            .unwrap();
    assert_eq!(
        before, after,
        "Paused providers must not be contacted or have their pause reset"
    );

    // Battle.net shares encrypted credentials, versioned configuration and session-bound OAuth state.
    let client_input = serde_json::json!({"instance_id":null,"revision":0,"client_id":"battle-client-id","api_key":"battle-private-secret"});
    let make_client_request = |body: serde_json::Value| {
        Request::builder()
            .method("PUT")
            .uri("/api/integrations/battlenet")
            .header("cookie", format!("lifecycle_session={token}"))
            .header("origin", "http://localhost:8081")
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap()
    };
    let response = crate::router(state.clone())
        .oneshot(make_client_request(client_input))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let providers: serde_json::Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 65536).await.unwrap()).unwrap();
    assert!(!providers.to_string().contains("battle-private-secret"));
    let battle = providers
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["id"] == "battlenet")
        .unwrap();
    assert_eq!(battle["configured"], true);
    assert_eq!(battle["connected"], false);
    let response = crate::router(state.clone())
        .oneshot(request(
            "POST",
            "/api/integrations/battlenet/connect".into(),
        ))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let start: serde_json::Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 16384).await.unwrap()).unwrap();
    let auth_url = url::Url::parse(start["url"].as_str().unwrap()).unwrap();
    assert_eq!(
        auth_url.origin().ascii_serialization(),
        "https://oauth.battle.net"
    );
    let oauth_state = auth_url
        .query_pairs()
        .find(|(key, _)| key == "state")
        .unwrap()
        .1
        .into_owned();
    let callback =
        format!("/api/integrations/battlenet/callback?state={oauth_state}&code=test-code");
    let response = crate::router(state.clone())
        .oneshot(
            Request::builder()
                .uri(&callback)
                .header("cookie", format!("lifecycle_session={foreign_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let attempts:i64=sqlx::query_scalar("SELECT count(*) FROM app.integration_auth_attempts WHERE user_id=$1 AND provider='battlenet'").bind(user).fetch_one(&state.database).await.unwrap();
    assert_eq!(attempts, 1);
    let response=crate::router(state.clone()).oneshot(make_client_request(serde_json::json!({"instance_id":battle["instance_id"],"revision":battle["revision"],"client_id":"battle-rotated-client","api_key":"battle-rotated-secret"}))).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let response = crate::router(state.clone())
        .oneshot(request("GET", callback))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    assert!(
        response.headers()["location"]
            .to_str()
            .unwrap()
            .contains("result=failed")
    );

    // Console session attempts cannot be redeemed by a different LifeCycle session.
    for provider in ["xbox", "playstation"] {
        let start_path = format!("/api/integrations/{provider}/connect");
        let response = crate::router(state.clone())
            .oneshot(request("POST", start_path))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let attempt: serde_json::Value =
            serde_json::from_slice(&to_bytes(response.into_body(), 16384).await.unwrap()).unwrap();
        let state_token = attempt["state"].as_str().unwrap();
        let credential = if provider == "xbox" {
            format!(
                "https://login.live.com/oauth20_desktop.srf#access_token=private-test&expires_in=3600&state={state_token}"
            )
        } else {
            "n".repeat(64)
        };
        let body = serde_json::json!({"state":state_token,"code":credential});
        let response = crate::router(state.clone())
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/integrations/{provider}/authorize"))
                    .header("cookie", format!("lifecycle_session={other_token}"))
                    .header("origin", "http://localhost:8081")
                    .header("content-type", "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let remaining: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM app.integration_auth_attempts WHERE user_id=$1 AND provider=$2",
        )
        .bind(user)
        .bind(provider)
        .fetch_one(&state.database)
        .await
        .unwrap();
        assert_eq!(remaining, 1);
        let pending:Option<chrono::DateTime<chrono::Utc>>=sqlx::query_scalar("SELECT authorization_started_at FROM app.integrations WHERE user_id=$1 AND provider=$2").bind(user).bind(provider).fetch_one(&state.database).await.unwrap();
        assert!(pending.is_none());
    }
    // The feedback adapter uses the existing session and enforces account boundaries.
    let subscription = serde_json::json!({"endpoint":"https://updates.push.services.mozilla.com/wpush/v1/test-device","keys":{"p256dh":"BLMbF9ffKBiWQLCKvTHb6LO8Nb6dcUh6TItC455vu2kElga6PQvUmaFyCdykxY2nOSSL3yKgfbmFLRTUaGv4yV8","auth":"xS03Fi5ErfTNH_l9WHE9Ig"}});
    let push_request = |method: &str, cookie: &str, body: serde_json::Value| {
        Request::builder()
            .method(method)
            .uri("/api/notifications/push")
            .header("cookie", format!("lifecycle_session={cookie}"))
            .header("origin", "http://localhost:8081")
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap()
    };
    for _ in 0..2 {
        let response = crate::router(state.clone())
            .oneshot(push_request("PUT", &token, subscription.clone()))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NO_CONTENT);
    }
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM app.feedback_push_subscriptions WHERE user_id=$1")
            .bind(user)
            .fetch_one(&state.database)
            .await
            .unwrap();
    assert_eq!(count, 1);
    let encrypted: Vec<u8> = sqlx::query_scalar(
        "SELECT encrypted_data FROM app.feedback_push_subscriptions WHERE user_id=$1",
    )
    .bind(user)
    .fetch_one(&state.database)
    .await
    .unwrap();
    assert!(!String::from_utf8_lossy(&encrypted).contains("test-device"));
    let response = crate::router(state.clone())
        .oneshot(push_request("GET", &token, serde_json::Value::Null))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let config: serde_json::Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 16384).await.unwrap()).unwrap();
    assert_eq!(config["subscriptions"].as_array().unwrap().len(), 1);
    assert!(!config.to_string().contains("IQ9Ur0yk"));
    let response = crate::router(state.clone())
        .oneshot(push_request(
            "DELETE",
            &foreign_token,
            serde_json::json!({"endpoint":subscription["endpoint"]}),
        ))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM app.feedback_push_subscriptions WHERE user_id=$1")
            .bind(user)
            .fetch_one(&state.database)
            .await
            .unwrap();
    assert_eq!(count, 1);
    sqlx::query("DELETE FROM app.sessions WHERE token_hash=$1")
        .bind(hex::encode(Sha256::digest(token.as_bytes())))
        .execute(&state.database)
        .await
        .unwrap();
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM app.feedback_push_subscriptions WHERE user_id=$1")
            .bind(user)
            .fetch_one(&state.database)
            .await
            .unwrap();
    assert_eq!(count, 0, "Logging out revokes background delivery");
    state.database.close().await;
}

#[test]
fn regional_prices_preserve_currency_and_steam_wire_scale() {
    use super::market::{country, price};
    assert_eq!(country("Россия").as_deref(), Some("RU"));
    assert_eq!(country("Japan").as_deref(), Some("JP"));
    assert_eq!(country(" "), None);
    assert_eq!(
        price(&serde_json::json!({"currency":"RUB","initial":100000,"final":9990})),
        Some(("99.90".into(), "1000.00".into(), "RUB".into(), 9000 + 1))
    );
    assert_eq!(
        price(&serde_json::json!({"currency":"JPY","initial":140000,"final":140000}))
            .unwrap()
            .0,
        "1400.00"
    );
    assert_eq!(
        price(&serde_json::json!({"currency":"KWD","initial":250,"final":250}))
            .unwrap()
            .0,
        "2.50"
    );
    assert!(price(&serde_json::json!({"currency":"XYZ","initial":100,"final":1})).is_none());
}
#[test]
fn announced_sales_discover_new_years_without_inventing_tbd_dates_or_times() {
    let html = "<h2>Seasonal Sales</h2><b>Winter Sale 2030</b> | 19 December, 2030 - 2 January, 2031<br>Spring Sale 2031 | 20 March, 2031 - 27 March, 2031<br>Summer Sale 2031 | TBD<h2>Themed Sale Events</h2>";
    let rows = super::market::steam_sales(html);
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].id, "steam-winter-2030");
    assert!(rows.iter().all(|sale| sale.all_day && !sale.stale));
}
#[test]
fn native_epic_giveaways_use_current_prices_and_explicit_promotion_windows() {
    let now = chrono::Utc::now();
    let start = now - chrono::Duration::days(1);
    let end = now + chrono::Duration::days(6);
    let future = end + chrono::Duration::days(7);
    let data = serde_json::json!({"data":{"Catalog":{"searchStore":{"elements":[{"id":"game","title":"Free game","price":{"totalPrice":{"discountPrice":0,"currencyCode":"JPY"}},"catalogNs":{"mappings":[{"pageSlug":"free-game"}]},"keyImages":[{"type":"OfferImageWide","url":"https://cdn1.epicgames.com/test.jpg"}],"promotions":{"promotionalOffers":[{"promotionalOffers":[{"startDate":start,"endDate":end,"discountSetting":{"discountPercentage":0}}]}],"upcomingPromotionalOffers":[{"promotionalOffers":[{"startDate":end,"endDate":future,"discountSetting":{"discountPercentage":0}}]}]}}]}}}});
    let (offers, sales) = super::market::epic(&data, "JP");
    assert_eq!(offers.len(), 1);
    assert!(offers[0].free);
    assert_eq!(offers[0].price_country.as_deref(), Some("JP"));
    assert_eq!(sales.len(), 2);
    assert!(sales.iter().all(|sale| sale.kind == "giveaway"));
    let mut paid = data.clone();
    paid["data"]["Catalog"]["searchStore"]["elements"][0]["price"]["totalPrice"]["discountPrice"] =
        serde_json::json!(99);
    assert!(super::market::epic(&paid, "JP").0.is_empty());
}
