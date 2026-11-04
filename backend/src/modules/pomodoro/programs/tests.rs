use super::models::Program;

fn program(repeat: bool) -> Program {
    Program {
        work_seconds: 2,
        chill_seconds: 1,
        more_chill_seconds: 3,
        sequence: vec!["w".into(), "c".into(), "w".into(), "mc".into()],
        repeat,
    }
}
#[test]
fn boundaries_cycles_and_long_suspension_are_arithmetic() {
    let p = program(true);
    assert_eq!(p.position(0), (0, 0));
    assert_eq!(p.position(2), (1, 0));
    assert_eq!(p.position(8), (4, 0));
    assert_eq!(p.position(8_000_001), (4_000_000, 1));
    assert_eq!(p.offset(4_000_000), 8_000_000);
    assert_eq!(program(false).position(999), (4, 0));
}
#[test]
fn program_rejects_empty_unknown_and_unbounded_intervals() {
    let mut p = program(false);
    assert!(p.validate().is_ok());
    p.sequence.clear();
    assert!(p.validate().is_err());
    p.sequence = vec!["c".into()];
    assert!(p.validate().is_err());
    p.sequence = vec!["w".into()];
    p.work_seconds = 0;
    assert!(p.validate().is_err());
}
