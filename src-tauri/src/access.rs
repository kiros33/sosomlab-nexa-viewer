//! 로컬 폴더 접근 허용 목록.
//!
//! 웹뷰가 보낸 `root`를 그대로 믿지 않는다 — 사용자가 **직접 연** 폴더만 읽기를 허용한다.
//! 허용(grant)은 백엔드 경로에서만 일어난다: 폴더/파일 선택 다이얼로그, 실행 인자(argv),
//! macOS `Opened`(Finder 더블클릭 등). 목록은 앱 데이터 디렉터리에 영속화해 재시작 후에도
//! 탐색기·최근 문서가 그대로 열린다.
//!
//! 이전 버전(≤0.3.4)에서 등록한 폴더는 프론트엔드 저장소에만 있으므로 `migrate`로 **한 번만**
//! 들여온다. 완료 여부는 목록 파일의 `migrated` 표시로 판단한다 — 파일 존재 여부로 보면 Finder
//! 파일 열기로 시작할 때 `Opened` grant가 먼저 파일을 만들어 이전이 건너뛰어진다(2026-10-09 실기).

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

const FILE: &str = "allowed-roots.json";

#[derive(Default, Serialize, Deserialize)]
struct Roots {
    /// 이전 버전 등록 폴더 이전을 마쳤는지(마친 뒤에는 migrate 무시)
    #[serde(default)]
    migrated: bool,
    #[serde(default)]
    roots: BTreeSet<PathBuf>,
}

fn state() -> &'static Mutex<Option<Roots>> {
    static S: OnceLock<Mutex<Option<Roots>>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(None))
}

fn file(dir: &Path) -> PathBuf {
    dir.join(FILE)
}

fn load(dir: &Path) -> Roots {
    std::fs::read_to_string(file(dir))
        .ok()
        .and_then(|s| serde_json::from_str::<Roots>(&s).ok())
        .unwrap_or_default()
}

fn save(dir: &Path, r: &Roots) {
    let _ = std::fs::create_dir_all(dir);
    if let Ok(json) = serde_json::to_string(r) {
        let _ = std::fs::write(file(dir), json);
    }
}

/// 잠금 + 최초 로드 후 `f` 실행.
fn with_roots<R>(dir: &Path, f: impl FnOnce(&mut Roots) -> R) -> R {
    let mut g = match state().lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };
    f(g.get_or_insert_with(|| load(dir)))
}

/// 폴더 접근을 허용한다(정규화 경로로 저장). 존재하지 않으면 무시.
pub fn grant(dir: &Path, root: &Path) {
    let Ok(canon) = std::fs::canonicalize(root) else { return };
    with_roots(dir, |r| {
        if r.roots.insert(canon) {
            save(dir, r);
        }
    });
}

/// `root`가 허용 목록의 폴더(또는 그 하위)인지.
pub fn is_allowed(dir: &Path, root: &Path) -> bool {
    let Ok(canon) = std::fs::canonicalize(root) else { return false };
    with_roots(dir, |r| r.roots.iter().any(|root| canon.starts_with(root)))
}

/// 이 기능이 생긴 뒤 첫 실행에서 한 번만 기존 등록 폴더를 들여온다.
/// 반환 = 실제로 들여왔는지.
pub fn migrate(dir: &Path, roots: &[String]) -> bool {
    with_roots(dir, |r| {
        if r.migrated {
            return false;
        }
        for root in roots {
            if let Ok(c) = std::fs::canonicalize(root) {
                if c.is_dir() {
                    r.roots.insert(c);
                }
            }
        }
        r.migrated = true; // 빈 목록이어도 표시해 이후 migrate를 막는다
        save(dir, r);
        true
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("nexa-access-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&p);
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    // 전역 상태를 공유하므로 시나리오를 한 테스트에서 순서대로 검사한다.
    #[test]
    fn grant_allow_and_migrate_once() {
        let data = tmp("data");
        let docs = tmp("docs");
        let sub = docs.join("sub");
        std::fs::create_dir_all(&sub).unwrap();
        let other = tmp("other");

        // Finder 열기 등으로 grant가 먼저 와도(파일 생성) migrate는 1회 허용
        grant(&data, &sub);
        assert!(migrate(&data, &[docs.to_string_lossy().into()]));
        assert!(is_allowed(&data, &docs));
        assert!(is_allowed(&data, &sub), "하위 폴더도 허용");
        assert!(!is_allowed(&data, &other));

        // 두 번째 migrate는 무시(웹뷰가 목록을 늘릴 수 없음)
        assert!(!migrate(&data, &[other.to_string_lossy().into()]));
        assert!(!is_allowed(&data, &other));

        // 백엔드 grant로만 추가
        grant(&data, &other);
        assert!(is_allowed(&data, &other));
        assert!(!is_allowed(&data, Path::new("/definitely/not/here")));
    }
}
