use crate::{infrastructure::state::AppState, shared::errors::ApiError};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use uuid::Uuid;

pub(super) fn digits(phone: &str) -> Result<String, ApiError> {
    let value = phone.trim();
    if value.len() != 12
        || !value.starts_with("+79")
        || !value[1..].bytes().all(|b| b.is_ascii_digit())
    {
        return Err(ApiError::validation("A Russian mobile number is required"));
    }
    Ok(value.into())
}

pub(super) fn fingerprint(s: &AppState, user: Uuid, phone: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(&s.config.data_encryption_key).expect("HMAC key");
    mac.update(format!("operator:{user}:{phone}").as_bytes());
    mac.finalize()
        .into_bytes()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}
