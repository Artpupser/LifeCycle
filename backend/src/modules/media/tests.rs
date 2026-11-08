use super::service::verify_image;

#[test]
fn mime_sniffing_rejects_html_svg_and_mismatched_binary() {
    assert!(verify_image("image/png", b"<script>alert(1)</script>").is_err());
    assert!(verify_image("image/svg+xml", b"<svg></svg>").is_err());
    assert!(verify_image("image/jpeg", b"\x89PNG\r\n\x1a\n").is_err());
}

#[test]
fn provider_assets_reject_spoofed_hosts_credentials_ports_and_local_networks() {
    for url in [
        "https://cdn1.epicgames.com/game.jpg",
        "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/400/header.jpg",
    ] {
        assert!(super::provider::trusted(url).is_some());
    }
    for url in [
        "http://cdn1.epicgames.com/game.jpg",
        "https://cdn1.epicgames.com.evil.test/game.jpg",
        "https://x@cdn1.epicgames.com/game.jpg",
        "https://127.0.0.1/game.jpg",
        "file:///etc/passwd",
        "https://cdn1.epicgames.com:444/game.jpg",
    ] {
        assert!(super::provider::trusted(url).is_none());
    }
}
