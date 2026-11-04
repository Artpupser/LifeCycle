use super::models::{Account, ISSUER, Pending};
use super::service::{authorization_url, has_scope, random, verify_identity};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::Utc;
use jsonwebtoken::{Algorithm, jwk::JwkSet};
use rand::rngs::OsRng;
use serde_json::json;
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[test]
fn registration_and_reauthorization_preserve_host_client_and_pkce() {
    let mut p = Pending {
        state: random(),
        nonce: random(),
        verifier: random(),
        session_hash: random(),
        redirect_uri: "http://127.0.0.1:8081/api/ai/login/callback".into(),
        host_id: format!("urn:uuid:{}", Uuid::new_v4()),
        account_id: None,
        account: None,
        result: None,
        registered_client: None,
    };
    let url = authorization_url(&p);
    let params: std::collections::HashMap<_, _> = url.query_pairs().collect();
    assert_eq!(params["client_id"], "dynamic_agent_client");
    assert_eq!(params["agent_name_hint"], "LifeCycle");
    assert_eq!(
        params["code_challenge"],
        URL_SAFE_NO_PAD.encode(Sha256::digest(p.verifier.as_bytes()))
    );
    assert!(has_scope(&params["scope"]));
    p.account = Some(Account {
        client_id: "oaiapp_saved".into(),
        subject: "subject".into(),
        email: None,
        credentials: None,
    });
    let url = authorization_url(&p);
    let params: std::collections::HashMap<_, _> = url.query_pairs().collect();
    assert_eq!(params["client_id"], "oaiapp_saved");
    assert!(!params.contains_key("agent_name_hint"));
    assert_eq!(params["ext_agent_host_id"], p.host_id);
    assert!(!has_scope(
        "openid resource.invoke chatgpt.tokens.use.direct.extra"
    ));
}
#[tokio::test]
async fn signed_identity_requires_matching_issuer_audience_nonce_expiry_and_key() {
    use jsonwebtoken::{EncodingKey, Header, encode};
    use rsa::{RsaPrivateKey, pkcs1::EncodeRsaPrivateKey, traits::PublicKeyParts};
    let key = RsaPrivateKey::new(&mut OsRng, 2048).unwrap();
    let jwks:JwkSet=serde_json::from_value(json!({"keys":[{"kty":"RSA","kid":"test","alg":"RS256","use":"sig","n":URL_SAFE_NO_PAD.encode(key.n().to_bytes_be()),"e":URL_SAFE_NO_PAD.encode(key.e().to_bytes_be())}]})).unwrap();
    let encoding = EncodingKey::from_rsa_der(key.to_pkcs1_der().unwrap().as_bytes());
    let mut header = Header::new(Algorithm::RS256);
    header.kid = Some("test".into());
    let now = Utc::now().timestamp();
    let claims = json!({"iss":ISSUER,"aud":["oaiapp_test"],"sub":"user","iat":now,"exp":now+3600,"nonce":"nonce"});
    let token = encode(&header, &claims, &encoding).unwrap();
    assert_eq!(
        verify_identity(&token, "oaiapp_test", Some("nonce"), &jwks)
            .await
            .unwrap()
            .sub,
        "user"
    );
    assert!(
        verify_identity(&token, "wrong", Some("nonce"), &jwks)
            .await
            .is_err()
    );
    assert!(
        verify_identity(&token, "oaiapp_test", Some("wrong"), &jwks)
            .await
            .is_err()
    );
    for (field, value) in [
        ("iss", json!("https://attacker.example")),
        ("exp", json!(now - 30)),
        ("iat", json!(now + 1000)),
        ("sub", json!("")),
    ] {
        let mut bad = claims.clone();
        bad[field] = value;
        let token = encode(&header, &bad, &encoding).unwrap();
        assert!(
            verify_identity(&token, "oaiapp_test", Some("nonce"), &jwks)
                .await
                .is_err()
        );
    }
    let empty = JwkSet { keys: vec![] };
    assert!(
        verify_identity(&token, "oaiapp_test", Some("nonce"), &empty)
            .await
            .is_err()
    );
}
#[tokio::test]
async fn identity_rejects_unsigned_and_wrong_algorithm_tokens() {
    let jwks = JwkSet { keys: vec![] };
    assert!(
        verify_identity("eyJhbGciOiJub25lIn0.e30.", "client", Some("nonce"), &jwks)
            .await
            .is_err()
    );
    assert!(
        verify_identity(
            "eyJhbGciOiJIUzI1NiJ9.e30.signature",
            "client",
            Some("nonce"),
            &jwks
        )
        .await
        .is_err()
    );
}
