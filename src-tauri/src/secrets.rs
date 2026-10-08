//! 토큰 등 민감정보 보관.
//!
//! GitHub 토큰은 **OS 키체인**(macOS Keychain · Windows Credential Manager · Linux Secret Service)에
//! 저장한다. 앱 데이터 디렉터리의 파일에는 로그인명만 남긴다(권한 0600).
//! - 키체인을 쓸 수 없으면(예: Secret Service 없는 Linux) 디스크에 쓰지 않고 **이번 실행 동안
//!   메모리에만** 보관한다 — 재시작하면 다시 로그인해야 한다.
//! - 이전 버전(≤0.3.4)의 파일 암호화 토큰(`token_enc`)은 처음 읽을 때 키체인으로 옮기고 파일에서 지운다.
//! - 읽은 토큰은 메모리에 캐시해 커맨드마다 키체인을 다시 열지 않는다.

use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

const FILE: &str = "github-credentials.enc";
const KEYRING_SERVICE: &str = "com.sosomlab.nexa-markdown-viewer";
const KEYRING_USER: &str = "github-token";

#[derive(Default, Serialize, Deserialize)]
struct Store {
    login: Option<String>,
    /// 이전 버전의 파일 암호화 토큰 — 마이그레이션 때만 읽는다(새로 쓰지 않음).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    token_enc: Option<String>,
}

/// 메모리 캐시: (로그인명, 토큰). `None` = 아직 안 읽음.
#[derive(Clone)]
struct Session {
    login: Option<String>,
    token: Option<String>,
}

fn cache() -> &'static Mutex<Option<Session>> {
    static C: OnceLock<Mutex<Option<Session>>> = OnceLock::new();
    C.get_or_init(|| Mutex::new(None))
}

fn store_path(dir: &Path) -> PathBuf {
    dir.join(FILE)
}

fn read_store(dir: &Path) -> Store {
    std::fs::read_to_string(store_path(dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_store(dir: &Path, store: &Store) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string(store).map_err(|e| e.to_string())?;
    let path = store_path(dir);
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

fn entry() -> Option<keyring::Entry> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).ok()
}

fn keyring_get() -> Option<String> {
    entry()?.get_password().ok().filter(|t| !t.is_empty())
}

fn keyring_set(token: &str) -> bool {
    entry().is_some_and(|e| e.set_password(token).is_ok())
}

fn keyring_delete() {
    if let Some(e) = entry() {
        let _ = e.delete_credential();
    }
}

/// 디스크(키체인 + 로그인명 파일)에서 세션을 읽는다. 이전 버전 토큰은 여기서 키체인으로 옮긴다.
fn load_session(dir: &Path) -> Session {
    let mut store = read_store(dir);
    let mut token = keyring_get();
    if token.is_none() {
        if let Some(legacy_token) = store.token_enc.as_deref().and_then(|e| legacy::decrypt(e).ok()) {
            if keyring_set(&legacy_token) {
                store.token_enc = None;
                let _ = write_store(dir, &store);
            }
            token = Some(legacy_token);
        }
    }
    // 토큰이 없으면 로그인 상태로 보지 않는다(로그인명만 남은 파일 = 로그아웃).
    let login = token.as_ref().and(store.login);
    Session { login, token }
}

fn session(dir: &Path) -> Session {
    let mut g = match cache().lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };
    g.get_or_insert_with(|| load_session(dir)).clone()
}

fn set_session(s: Session) {
    let mut g = match cache().lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };
    *g = Some(s);
}

/// 로그인명 + 토큰 저장. 반환값 = 키체인에 영구 저장됐는지(false면 이번 실행 동안만 유지).
pub fn save_github(dir: &Path, login: &str, token: &str) -> Result<bool, String> {
    let persisted = keyring_set(token);
    if persisted {
        write_store(dir, &Store { login: Some(login.to_string()), token_enc: None })?;
    } else {
        // 키체인 없음: 디스크에는 아무것도 남기지 않는다(이전 파일도 정리).
        let _ = std::fs::remove_file(store_path(dir));
    }
    set_session(Session { login: Some(login.to_string()), token: Some(token.to_string()) });
    Ok(persisted)
}

pub fn load_github_token(dir: &Path) -> Option<String> {
    session(dir).token
}

pub fn load_github_login(dir: &Path) -> Option<String> {
    session(dir).login
}

pub fn clear_github(dir: &Path) -> Result<(), String> {
    keyring_delete();
    set_session(Session { login: None, token: None });
    let p = store_path(dir);
    if p.exists() {
        std::fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 이전 버전(≤0.3.4) 파일 암호화 형식 — 마이그레이션 복호화 전용.
mod legacy {
    use aes_gcm::aead::Aead;
    use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
    use base64::Engine;
    use sha2::{Digest, Sha256};

    const PEPPER: &str = "nexa-markdown-viewer::v1::sosomlab";

    fn cipher() -> Aes256Gcm {
        let user = std::env::var("USER")
            .or_else(|_| std::env::var("USERNAME"))
            .unwrap_or_default();
        let mut h = Sha256::new();
        h.update(PEPPER.as_bytes());
        h.update(user.as_bytes());
        let digest = h.finalize();
        Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&digest))
    }

    pub fn decrypt(b64: &str) -> Result<String, String> {
        let blob = base64::engine::general_purpose::STANDARD
            .decode(b64)
            .map_err(|e| e.to_string())?;
        if blob.len() < 13 {
            return Err("손상된 자격 증명".into());
        }
        let (nonce, ct) = blob.split_at(12);
        let pt = cipher()
            .decrypt(Nonce::from_slice(nonce), ct)
            .map_err(|e| e.to_string())?;
        String::from_utf8(pt).map_err(|e| e.to_string())
    }

    #[cfg(test)]
    pub fn encrypt(plain: &str) -> String {
        let nonce = [7u8; 12];
        let ct = cipher().encrypt(Nonce::from_slice(&nonce), plain.as_bytes()).unwrap();
        let mut blob = nonce.to_vec();
        blob.extend_from_slice(&ct);
        base64::engine::general_purpose::STANDARD.encode(blob)
    }
}

#[cfg(test)]
mod tests {
    use super::legacy;

    #[test]
    fn legacy_roundtrip() {
        assert_eq!(legacy::decrypt(&legacy::encrypt("ghp_test")).unwrap(), "ghp_test");
    }

    #[test]
    fn legacy_rejects_garbage() {
        assert!(legacy::decrypt("AAAA").is_err());
        assert!(legacy::decrypt("not base64!").is_err());
    }
}
