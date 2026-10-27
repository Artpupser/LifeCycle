use crate::error::ApiError;
use aes_gcm::{
    Aes256Gcm, KeyInit, Nonce,
    aead::{Aead, Payload},
};
use rand::{RngCore, rngs::OsRng};

#[derive(Clone)]
pub struct DataCipher(Aes256Gcm);

impl DataCipher {
    pub fn new(key: &[u8; 32]) -> Self {
        Self(Aes256Gcm::new(key.into()))
    }
    pub fn encrypt(&self, plain: &[u8], context: &[u8]) -> Result<Vec<u8>, ApiError> {
        let mut nonce = [0u8; 12];
        OsRng.fill_bytes(&mut nonce);
        let ciphertext = self
            .0
            .encrypt(
                Nonce::from_slice(&nonce),
                Payload {
                    msg: plain,
                    aad: context,
                },
            )
            .map_err(|_| ApiError::internal())?;
        let mut out = nonce.to_vec();
        out.extend(ciphertext);
        Ok(out)
    }
    pub fn decrypt(&self, data: &[u8], context: &[u8]) -> Result<Vec<u8>, ApiError> {
        if data.len() < 28 {
            return Err(ApiError::internal());
        }
        self.0
            .decrypt(
                Nonce::from_slice(&data[..12]),
                Payload {
                    msg: &data[12..],
                    aad: context,
                },
            )
            .map_err(|_| ApiError::internal())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn encryption_binds_data_to_its_owner_and_detects_tampering() {
        let cipher = DataCipher::new(&[7; 32]);
        let plaintext = b"private medical data";
        let mut encrypted = cipher.encrypt(plaintext, b"profile:user-a").ok().unwrap();
        assert!(!encrypted.windows(plaintext.len()).any(|w| w == plaintext));
        assert_eq!(
            cipher.decrypt(&encrypted, b"profile:user-a").ok().unwrap(),
            plaintext
        );
        assert!(cipher.decrypt(&encrypted, b"profile:user-b").is_err());
        encrypted[12] ^= 1;
        assert!(cipher.decrypt(&encrypted, b"profile:user-a").is_err());
    }
}
