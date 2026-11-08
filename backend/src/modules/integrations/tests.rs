use super::{service, steam};
use std::collections::BTreeMap;
#[test]
fn integration_identity_accepts_only_individual_steam_accounts() {
    for id in ["76561198000000000", "76561202000000000"] {
        assert_eq!(
            steam::account_id(&format!("https://steamcommunity.com/openid/id/{id}")).unwrap(),
            id
        );
    }
    for value in [
        "https://steamcommunity.com.evil.test/openid/id/76561198000000000",
        "https://evil@steamcommunity.com/openid/id/76561198000000000",
        "https://steamcommunity.com/openid/id/76561198000000000?x=1",
        "https://steamcommunity.com/openid/id/not-a-number",
        "https://steamcommunity.com/openid/id/12345678901234567",
    ] {
        assert!(steam::account_id(value).is_err(), "{value}");
    }
}
fn assertion() -> BTreeMap<String, String> {
    [
        ("openid.ns", "http://specs.openid.net/auth/2.0"),
        ("openid.mode", "id_res"),
        ("openid.op_endpoint", steam::ENDPOINT),
        (
            "openid.return_to",
            "https://life.test/api/integrations/steam/callback?state=random",
        ),
        (
            "openid.identity",
            "https://steamcommunity.com/openid/id/76561198000000000",
        ),
        (
            "openid.claimed_id",
            "https://steamcommunity.com/openid/id/76561198000000000",
        ),
        (
            "openid.signed",
            "op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
        ),
    ]
    .into_iter()
    .map(|(k, v)| (k.into(), v.into()))
    .chain([(
        "openid.response_nonce".into(),
        format!("{}nonce", chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ")),
    )])
    .collect()
}
#[test]
fn integration_assertion_rejects_forged_return_to_unsigned_identity_and_replay_window() {
    let expected = "https://life.test/api/integrations/steam/callback?state=random";
    let mut params = assertion();
    assert!(steam::validate_assertion(&params, expected).is_ok());
    assert!(
        steam::validate_assertion(
            &params,
            "https://life.test/api/integrations/steam/callback?state=another"
        )
        .is_err()
    );
    params.insert(
        "openid.signed".into(),
        "op_endpoint,return_to,response_nonce,assoc_handle".into(),
    );
    assert!(steam::validate_assertion(&params, expected).is_err());
    params = assertion();
    params.insert(
        "openid.response_nonce".into(),
        "2000-01-01T00:00:00Zreplayed".into(),
    );
    assert!(steam::validate_assertion(&params, expected).is_err());
    params = assertion();
    params.insert(
        "openid.op_endpoint".into(),
        "https://evil.test/openid".into(),
    );
    assert!(steam::validate_assertion(&params, expected).is_err());
}
#[test]
fn integration_keys_validate_before_storage() {
    assert!(service::validate_key("0123456789abcdef0123456789abcdef").is_ok());
    for value in [
        "password",
        "0123456789abcdef0123456789abcdeg",
        "0123456789abcdef\n0123456789abcdef",
    ] {
        assert!(service::validate_key(value).is_err());
    }
}
