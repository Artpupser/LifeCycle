use super::service::digits;

#[test]
fn accepts_only_normalized_russian_numbers() {
    assert!(digits("+79161234567").is_ok());
    for value in [
        "79161234567",
        "+491234567890",
        "+79161234567\nX:1",
        "+7900<script>",
    ] {
        assert!(digits(value).is_err());
    }
}
