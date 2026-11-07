//! Typed relationships extend the contact owner. The tree is only a projection;
//! contact records, ownership, deletion and AI permissions remain authoritative.
use super::repository::lock;
use crate::{
    infrastructure::state::AppState,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, put},
};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::PgConnection;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

const MAX_RELATIONSHIPS: usize = 2000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum Kind {
    Parent,
    Partner,
    RomanticPartner,
    Spouse,
    FormerSpouse,
    AdoptiveParent,
    StepParent,
    Godparent,
    Guardian,
    Sibling,
    Friend,
    Colleague,
    Other,
}
impl Kind {
    fn directed(self) -> bool {
        matches!(
            self,
            Self::Parent
                | Self::AdoptiveParent
                | Self::StepParent
                | Self::Godparent
                | Self::Guardian
        )
    }
    fn parental(self) -> bool {
        matches!(self, Self::Parent | Self::AdoptiveParent)
    }
    fn couple(self) -> bool {
        matches!(self, Self::Partner | Self::RomanticPartner | Self::Spouse)
    }
    fn category(self) -> &'static str {
        match self {
            Self::Parent
            | Self::Partner
            | Self::RomanticPartner
            | Self::Spouse
            | Self::FormerSpouse
            | Self::Sibling
            | Self::AdoptiveParent
            | Self::StepParent
            | Self::Godparent
            | Self::Guardian => "family",
            Self::Friend | Self::Colleague | Self::Other => "social",
        }
    }
}
#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Input {
    source_id: Uuid,
    target_id: Uuid,
    kind: Kind,
}
impl Input {
    fn normalized(mut self) -> Result<Self, ApiError> {
        if self.source_id == self.target_id {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "contact_relationship_self",
                "A contact cannot be related to itself",
            ));
        }
        if !self.kind.directed() && self.source_id > self.target_id {
            std::mem::swap(&mut self.source_id, &mut self.target_id);
        }
        Ok(self)
    }
}
#[derive(Clone, Serialize)]
struct Relationship {
    id: Uuid,
    source_id: Uuid,
    target_id: Uuid,
    kind: Kind,
    category: &'static str,
    revision: i64,
}
#[derive(sqlx::FromRow)]
struct Row {
    id: Uuid,
    source_id: Uuid,
    target_id: Uuid,
    encrypted_data: Vec<u8>,
    revision: i64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Revision {
    revision: i64,
}

pub(super) fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/contacts/relationships", get(list).post(create))
        .route(
            "/api/contacts/relationships/{id}",
            put(update).delete(remove),
        )
}

fn aad(user: Uuid, id: Uuid, source: Uuid, target: Uuid) -> String {
    format!("contact-relationship:{user}:{id}:{source}:{target}")
}
fn decode(state: &AppState, user: Uuid, row: Row) -> Result<Relationship, ApiError> {
    let kind: Kind = serde_json::from_slice(&state.cipher.decrypt(
        &row.encrypted_data,
        aad(user, row.id, row.source_id, row.target_id).as_bytes(),
    )?)
    .map_err(|error| ApiError::internal_with_context("Deserialize contact relationship", &error))?;
    Ok(Relationship {
        id: row.id,
        source_id: row.source_id,
        target_id: row.target_id,
        kind,
        category: kind.category(),
        revision: row.revision,
    })
}
async fn all(
    state: &AppState,
    db: &mut PgConnection,
    user: Uuid,
) -> Result<Vec<Relationship>, ApiError> {
    let rows: Vec<Row> = sqlx::query_as(
        "SELECT id,source_id,target_id,encrypted_data,revision FROM app.contact_relationships WHERE user_id=$1 ORDER BY id",
    )
    .bind(user)
    .fetch_all(db)
    .await?;
    rows.into_iter()
        .map(|row| decode(state, user, row))
        .collect()
}

fn reaches(parents: &HashMap<Uuid, Vec<Uuid>>, from: Uuid, to: Uuid) -> bool {
    let mut seen = HashSet::new();
    let mut pending = vec![from];
    while let Some(current) = pending.pop() {
        if current == to {
            return true;
        }
        if seen.insert(current)
            && let Some(children) = parents.get(&current)
        {
            pending.extend(children);
        }
    }
    false
}
fn validate(input: Input, relationships: &[Relationship]) -> Result<(), ApiError> {
    if relationships.iter().any(|old| {
        old.kind == input.kind
            && old.source_id == input.source_id
            && old.target_id == input.target_id
    }) {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "contact_relationship_duplicate",
            "Contact relationship already exists",
        ));
    }
    let mut parents: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    for old in relationships.iter().filter(|old| old.kind.parental()) {
        parents
            .entry(old.source_id)
            .or_default()
            .push(old.target_id);
    }
    if input.kind.parental() {
        if reaches(&parents, input.target_id, input.source_id) {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "contact_relationship_cycle",
                "A family tree cannot contain an ancestry cycle",
            ));
        }
        parents
            .entry(input.source_id)
            .or_default()
            .push(input.target_id);
    }
    // Validate both existing and candidate family pairs against the resulting
    // ancestry: a later parent edge must not turn siblings/partners into ancestors.
    let family_pairs = relationships
        .iter()
        .filter(|old| old.kind == Kind::Sibling || old.kind.couple())
        .map(|old| (old.source_id, old.target_id));
    let candidate_pair = (input.kind == Kind::Sibling || input.kind.couple())
        .then_some((input.source_id, input.target_id));
    for (first, second) in family_pairs.chain(candidate_pair) {
        if reaches(&parents, first, second) || reaches(&parents, second, first) {
            return Err(ApiError::new(
                StatusCode::BAD_REQUEST,
                "contact_relationship_family_conflict",
                "Ancestors cannot also be siblings or partners",
            ));
        }
    }
    Ok(())
}

async fn list(
    State(state): State<AppState>,
    user: CurrentUser,
) -> Result<Json<Vec<Relationship>>, ApiError> {
    Ok(Json(
        all(&state, &mut *state.database.acquire().await?, user.id).await?,
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Update {
    revision: i64,
    data: Input,
}

async fn create(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(input): ApiJson<Input>,
) -> Result<(StatusCode, Json<Relationship>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save(&state, user.id, input, None).await?),
    ))
}
async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(input): ApiJson<Update>,
) -> Result<Json<Relationship>, ApiError> {
    Ok(Json(
        save(&state, user.id, input.data, Some((id, input.revision))).await?,
    ))
}
/// Creation and editing share ownership, locking, canonical keys and ancestry validation.
async fn save(
    state: &AppState,
    user: Uuid,
    input: Input,
    current: Option<(Uuid, i64)>,
) -> Result<Relationship, ApiError> {
    let input = input.normalized()?;
    let mut tx = state.database.begin().await?;
    lock(&mut tx, user).await?;
    let mut existing = all(state, &mut tx, user).await?;
    let id = if let Some((id, revision)) = current {
        let old = existing
            .iter()
            .find(|edge| edge.id == id)
            .ok_or_else(domain::not_found)?;
        if revision < 0 || old.revision != revision {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "contact_relationship_stale",
                "Contact relationship changed",
            ));
        }
        existing.retain(|edge| edge.id != id);
        id
    } else {
        if existing.len() >= MAX_RELATIONSHIPS {
            return Err(ApiError::validation(
                "At most 2000 contact relationships are supported",
            ));
        }
        Uuid::new_v4()
    };
    let owned: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM app.contacts WHERE user_id=$1 AND id<>$1 AND id=ANY($2)",
    )
    .bind(user)
    .bind(vec![input.source_id, input.target_id])
    .fetch_one(&mut *tx)
    .await?;
    if owned + i64::from(input.source_id == user || input.target_id == user) != 2 {
        return Err(domain::not_found());
    }
    validate(input, &existing)?;
    let kind = serde_json::to_vec(&input.kind).map_err(|_| ApiError::internal())?;
    let encrypted = state.cipher.encrypt(
        &kind,
        aad(user, id, input.source_id, input.target_id).as_bytes(),
    )?;
    let mut mac =
        Hmac::<Sha256>::new_from_slice(&state.config.data_encryption_key).expect("HMAC key");
    mac.update(
        format!(
            "contact-relationship:{user}:{}:{}:",
            input.source_id, input.target_id
        )
        .as_bytes(),
    );
    mac.update(&kind);
    let key = hex::encode(mac.finalize().into_bytes());
    let revision = if let Some((_, revision)) = current {
        sqlx::query("UPDATE app.contact_relationships SET source_id=$3,target_id=$4,relation_key=$5,encrypted_data=$6,revision=revision+1 WHERE user_id=$1 AND id=$2")
            .bind(user).bind(id).bind(input.source_id).bind(input.target_id).bind(key).bind(encrypted).execute(&mut *tx).await?;
        revision + 1
    } else {
        sqlx::query("INSERT INTO app.contact_relationships(id,user_id,source_id,target_id,relation_key,encrypted_data) VALUES($1,$2,$3,$4,$5,$6)")
            .bind(id).bind(user).bind(input.source_id).bind(input.target_id).bind(key).bind(encrypted).execute(&mut *tx).await?;
        0
    };
    tx.commit().await?;
    Ok(Relationship {
        id,
        source_id: input.source_id,
        target_id: input.target_id,
        kind: input.kind,
        category: input.kind.category(),
        revision,
    })
}
async fn remove(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(input): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    if input.revision < 0 {
        return Err(ApiError::validation(
            "Relationship revision must be non-negative",
        ));
    }
    let mut tx = state.database.begin().await?;
    lock(&mut tx, user.id).await?;
    let revision: i64 = sqlx::query_scalar(
        "SELECT revision FROM app.contact_relationships WHERE user_id=$1 AND id=$2",
    )
    .bind(user.id)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    if revision != input.revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "contact_relationship_stale",
            "Contact relationship changed",
        ));
    }
    sqlx::query("DELETE FROM app.contact_relationships WHERE user_id=$1 AND id=$2")
        .bind(user.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn person(id: u128) -> Uuid {
        Uuid::from_u128(id)
    }
    fn input(source: u128, target: u128, kind: Kind) -> Input {
        Input {
            source_id: person(source),
            target_id: person(target),
            kind,
        }
        .normalized()
        .unwrap()
    }
    fn edge(source: u128, target: u128, kind: Kind) -> Relationship {
        let input = input(source, target, kind);
        Relationship {
            id: Uuid::new_v4(),
            source_id: input.source_id,
            target_id: input.target_id,
            kind,
            category: kind.category(),
            revision: 0,
        }
    }
    #[test]
    fn marriage_romance_and_adoption_share_canonical_and_ancestry_checks() {
        for kind in [Kind::Spouse, Kind::RomanticPartner] {
            assert_eq!(input(2, 1, kind).source_id, person(1));
            assert!(validate(input(1, 2, kind), &[edge(1, 2, Kind::Parent)]).is_err());
        }
        let adoptive = vec![edge(1, 2, Kind::AdoptiveParent), edge(2, 3, Kind::Parent)];
        assert!(validate(input(3, 1, Kind::Parent), &adoptive).is_err());
        for kind in [Kind::Godparent, Kind::StepParent, Kind::Guardian] {
            assert_eq!(input(2, 1, kind).source_id, person(2));
        }
    }
    #[test]
    fn symmetric_links_are_canonical_but_parent_links_keep_direction() {
        assert_eq!(input(2, 1, Kind::Sibling).source_id, person(1));
        assert_eq!(input(2, 1, Kind::Parent).source_id, person(2));
        assert!(
            Input {
                source_id: person(1),
                target_id: person(1),
                kind: Kind::Friend
            }
            .normalized()
            .is_err()
        );
        assert!(validate(input(2, 1, Kind::Sibling), &[edge(1, 2, Kind::Sibling)]).is_err());
    }
    #[test]
    fn ancestry_cycles_and_later_family_contradictions_are_rejected() {
        let ancestry = vec![edge(1, 2, Kind::Parent), edge(2, 3, Kind::Parent)];
        assert!(validate(input(3, 1, Kind::Parent), &ancestry).is_err());
        assert!(validate(input(1, 3, Kind::Sibling), &ancestry).is_err());
        assert!(validate(input(1, 3, Kind::Partner), &ancestry).is_err());
        let siblings = vec![edge(1, 3, Kind::Sibling), edge(1, 2, Kind::Parent)];
        assert!(validate(input(2, 3, Kind::Parent), &siblings).is_err());
        assert!(validate(input(4, 3, Kind::Parent), &siblings).is_ok());
    }
    #[test]
    fn social_links_stay_separate_and_multiple_parents_are_supported() {
        let ancestry = vec![edge(1, 3, Kind::Parent), edge(2, 3, Kind::Parent)];
        assert!(validate(input(1, 3, Kind::Friend), &ancestry).is_ok());
        assert!(validate(input(4, 3, Kind::Parent), &ancestry).is_ok());
        assert_eq!(Kind::Sibling.category(), "family");
        assert_eq!(Kind::Colleague.category(), "social");
    }
}
