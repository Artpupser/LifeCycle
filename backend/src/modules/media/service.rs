use super::models::MAX_BYTES;
use crate::shared::errors::ApiError;

pub(super) fn verify_image(mime: &str, bytes: &[u8]) -> Result<(), ApiError> {
    let valid = match mime {
        "image/png" => {
            bytes.len() >= 24
                && bytes.starts_with(b"\x89PNG\r\n\x1a\n")
                && &bytes[12..16] == b"IHDR"
        }
        "image/jpeg" => {
            bytes.len() >= 4
                && bytes.starts_with(&[0xff, 0xd8, 0xff])
                && bytes.ends_with(&[0xff, 0xd9])
        }
        "image/webp" => {
            bytes.len() >= 16
                && bytes.starts_with(b"RIFF")
                && &bytes[8..12] == b"WEBP"
                && [&b"VP8 "[..], &b"VP8L"[..], &b"VP8X"[..]].contains(&&bytes[12..16])
        }
        _ => false,
    };
    if bytes.len() > MAX_BYTES || !valid {
        return Err(ApiError::validation(
            "Upload a PNG, JPEG or WebP image with matching content type, at most 8 MiB",
        ));
    }
    Ok(())
}
