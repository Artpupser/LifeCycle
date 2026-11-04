use crate::shared::errors::ApiError;
use serde::{Deserialize, Serialize};

#[derive(Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct Conditions {
    pub goals: Option<String>,
    pub equipment: Option<String>,
    pub restrictions: Option<String>,
}

impl Conditions {
    pub(super) fn normalize(mut self) -> Result<Self, ApiError> {
        for field in [&mut self.goals, &mut self.equipment, &mut self.restrictions] {
            if let Some(text) = field {
                if text.chars().count() > 2000 {
                    return Err(ApiError::validation(
                        "Training fields support at most 2000 characters",
                    ));
                }
                *field = match text.trim() {
                    "" => None,
                    value => Some(value.to_owned()),
                };
            }
        }
        Ok(self)
    }
}

#[derive(Default, Serialize)]
pub(crate) struct Preferences {
    pub revision: i64,
    pub data: Conditions,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Input {
    pub(super) revision: i64,
    pub(super) data: Conditions,
}
