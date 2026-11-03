use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
pub(super) struct Details {
    pub(super) full_name: String,
    pub(super) phone: String,
    pub(super) occupation: String,
    pub(super) relationship: String,
    pub(super) notes: String,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
pub(super) struct Display {
    pub(super) clock: String,
    pub(super) show_years: bool,
    pub(super) show_repetitions: bool,
}
impl Default for Display {
    fn default() -> Self {
        Self {
            clock: "both".into(),
            show_years: true,
            show_repetitions: true,
        }
    }
}
#[derive(Clone, sqlx::FromRow)]
pub(super) struct Row {
    pub(super) id: Uuid,
    pub(super) title: String,
    pub(super) category: String,
    #[sqlx(default)]
    pub(super) tags: DbJson<Vec<String>>,
    pub(super) icon: String,
    pub(super) target_date: NaiveDate,
    pub(super) recurrence: String,
    pub(super) target_time: Option<NaiveTime>,
    pub(super) timezone: Option<String>,
    pub(super) description: String,
    pub(super) details: DbJson<Details>,
    pub(super) display: DbJson<Display>,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
    pub(super) contact_id: Option<Uuid>,
    pub(super) contact_birthday: bool,
    pub(super) contact_snapshot: Option<Vec<u8>>,
    #[sqlx(skip)]
    pub(super) suspended: bool,
    #[sqlx(skip)]
    pub(super) contact_name: Option<String>,
}
#[derive(Serialize, Deserialize)]
pub(super) struct Snapshot {
    pub(super) title: String,
    pub(super) target_date: Option<NaiveDate>,
    pub(super) details: Details,
}
#[derive(Serialize)]
pub(crate) struct Countdown {
    pub(super) id: Uuid,
    pub(super) title: String,
    pub(super) category: String,
    pub(super) tags: Vec<String>,
    pub(super) icon: String,
    pub(super) target_date: Option<NaiveDate>,
    pub(super) repeat_yearly: bool,
    pub(super) recurrence: String,
    pub(super) target_time: Option<NaiveTime>,
    pub(super) timezone: String,
    pub(super) description: String,
    pub(super) details: Details,
    pub(super) display: Display,
    pub(super) next_date: Option<NaiveDate>,
    pub(super) days_remaining: Option<i64>,
    pub(super) next_at: Option<DateTime<Utc>>,
    pub(super) original_at: Option<DateTime<Utc>>,
    pub(super) seconds_remaining: Option<i64>,
    pub(super) seconds_elapsed: Option<i64>,
    pub(super) full_years: Option<i32>,
    pub(super) repetitions: i64,
    pub(super) computed_at: DateTime<Utc>,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
    pub(super) contact_id: Option<Uuid>,
    pub(super) contact_name: Option<String>,
    pub(super) contact_birthday: bool,
    pub(super) suspended: bool,
}
#[derive(Serialize)]
pub(crate) struct EventOccurrence {
    pub date: NaiveDate,
    pub event_at: DateTime<Utc>,
    pub countdown: Countdown,
}
