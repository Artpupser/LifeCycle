use super::service::verify_image;

#[test]
fn mime_sniffing_rejects_html_svg_and_mismatched_binary() {
    assert!(verify_image("image/png", b"<script>alert(1)</script>").is_err());
    assert!(verify_image("image/svg+xml", b"<svg></svg>").is_err());
    assert!(verify_image("image/jpeg", b"\x89PNG\r\n\x1a\n").is_err());
}
