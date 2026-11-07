fn main() {
    // sqlx::migrate! tracks existing files; watch the directory for new ones too.
    println!("cargo:rerun-if-changed=migrations");
}
