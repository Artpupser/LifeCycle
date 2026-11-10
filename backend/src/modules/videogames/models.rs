use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Offer {
    pub id: String,
    pub platform: String,
    pub title: String,
    pub app_id: Option<String>,
    pub price: String,
    pub regular_price: Option<String>,
    pub currency: String,
    pub discount_basis_points: u32,
    pub free: bool,
    pub url: String,
    pub claim_url: String,
    pub source: String,
    pub ends_at: Option<DateTime<Utc>>,
    #[serde(default = "unknown")]
    pub ownership: String,
    #[serde(default)]
    pub ownership_ids: Vec<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub preview: Option<String>,
    #[serde(default)]
    pub price_country: Option<String>,
    #[serde(default)]
    pub price_unavailable: bool,
}
fn unknown() -> String {
    "unknown".into()
}
#[derive(Serialize, Deserialize, Clone)]
pub struct Sale {
    pub id: String,
    pub platform: String,
    pub title: String,
    pub title_en: String,
    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
    pub source: String,
    pub verified_on: String,
    #[serde(default)]
    pub all_day: bool,
    #[serde(default)]
    pub stale: bool,
    #[serde(default = "seasonal")]
    pub kind: String,
}
fn seasonal() -> String {
    "seasonal".into()
}
pub fn sales() -> Vec<Sale> {
    serde_json::from_str(include_str!("../../../../shared/game-sales.json"))
        .expect("game sales registry")
}
#[derive(Deserialize, Clone)]
pub struct Platform {
    pub id: String,
    pub giveaway_name: String,
    #[serde(default)]
    pub giveaway_aliases: Vec<String>,
    pub hosts: Vec<String>,
}
pub fn platforms() -> Vec<Platform> {
    serde_json::from_str(include_str!("../../../../shared/game-platforms.json"))
        .expect("game platforms registry")
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Preferences {
    pub notify_free: bool,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Mark {
    pub offer_id: String,
    pub acquired: bool,
}
#[derive(Serialize)]
pub struct Stats {
    pub available: bool,
    pub games: usize,
    pub played: Option<usize>,
    pub playtime_minutes: Option<u64>,
    pub recent_minutes: Option<u64>,
}
#[derive(Serialize)]
pub struct Catalog {
    pub country: Option<String>,
    pub connected_platforms: Vec<String>,
    pub unavailable_sales: Vec<String>,
    pub offers: Vec<Offer>,
    pub library: Vec<crate::modules::integrations::Game>,
    pub stats: Stats,
    pub sales: Vec<Sale>,
    pub calendar_sales: Vec<String>,
    pub notify_free: bool,
    pub checked_at: Option<DateTime<Utc>>,
    pub unavailable_sources: Vec<String>,
}
