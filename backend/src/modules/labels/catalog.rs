use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Deserialize)]
pub(crate) struct Collection {
    pub(crate) id: String,
    pub(crate) expandable: bool,
    pub(crate) entries: Vec<CollectionValue>,
}
#[derive(Deserialize)]
pub(crate) struct CollectionValue {
    pub(crate) value: String,
    pub(crate) name: String,
    pub(crate) description: String,
    pub(crate) icon: String,
}
pub(super) fn fixed_entry(kind: &str, name: &str) -> Option<&'static CollectionValue> {
    collection_catalog()
        .iter()
        .find(|item| item.id == kind && !item.expandable)
        .and_then(|item| {
            item.entries
                .iter()
                .find(|entry| entry.value == name || entry.name == name)
        })
}
pub(super) fn fixed_icon(kind: &str, name: &str) -> Option<String> {
    fixed_entry(kind, name).map(|entry| entry.icon.clone())
}
pub(super) fn stored_value(kind: &str, name: &str) -> Option<String> {
    fixed_entry(kind, name).map(|entry| entry.value.clone())
}
pub(super) async fn seed(
    s: &crate::infrastructure::state::AppState,
    db: &mut sqlx::PgConnection,
    user: uuid::Uuid,
) -> Result<(), crate::shared::errors::ApiError> {
    use super::{
        models::Data,
        service::{encode, key},
    };
    for kind in collection_catalog().iter().filter(|kind| !kind.expandable) {
        for entry in &kind.entries {
            let id = uuid::Uuid::new_v4();
            let data = Data {
                name: entry.name.clone(),
                description: entry.description.clone(),
                icon: Some(entry.icon.clone()),
                color: crate::shared::domain::default_color(),
                in_collection: true,
                ..Data::default()
            };
            sqlx::query("INSERT INTO app.labels(id,user_id,kind,name_key,encrypted_data,is_system) VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(user_id,kind,name_key) DO UPDATE SET is_system=true")
                .bind(id).bind(user).bind(&kind.id).bind(key(s,user,&kind.id,&entry.name)).bind(encode(s,user,id,&data)?).execute(&mut *db).await?;
        }
    }
    Ok(())
}
pub(crate) fn collection_catalog() -> &'static [Collection] {
    static CATALOG: OnceLock<Vec<Collection>> = OnceLock::new();
    CATALOG.get_or_init(|| {
        serde_json::from_str(include_str!("../../../../shared/collections.json"))
            .expect("shared collection catalog")
    })
}
pub(crate) fn collection_expandable(kind: &str) -> Option<bool> {
    collection_catalog()
        .iter()
        .find(|item| item.id == kind)
        .map(|item| item.expandable)
}
pub(crate) fn fixed_collection_value(kind: &str, value: &str) -> bool {
    collection_catalog()
        .iter()
        .find(|item| item.id == kind && !item.expandable)
        .is_some_and(|item| item.entries.iter().any(|entry| entry.value == value))
}
