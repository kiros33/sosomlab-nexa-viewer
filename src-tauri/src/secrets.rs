//! 토큰 등 민감정보의 암호화 로컬 저장.
//!
//! AES-256-GCM으로 암호화하여 앱 로컬 데이터 디렉터리에 저장한다.
//! 키는 앱 고정 pepper + OS 사용자명에서 파생한다(평문 저장 방지 수준의 보호).
//! 추후 OS 키체인/패스프레이즈 기반 키로 강화 가능.

use std::path::{Path, PathBuf};

use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const PEPPER: &str = "nexa-markdown-viewer::v1::sosomlab";
const FILE: &str = "github-credentials.enc";

#[derive(Default, Serialize, Deserialize)]
struct Store {
    login: Option<String>,
    token_enc: Option<String>,
}

fn store_path(dir: &Path) -> PathBuf {
    dir.join(FILE)
}

fn cipher() -> Aes256Gcm {
    let user = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_default();
    let mut h = Sha256::new();
    h.update(PEPPER.as_bytes());
    h.update(user.as_bytes());
    let digest = h.finalize();
    let key = Key::<Aes256Gcm>::from_slice(&digest);
    Aes256Gcm::new(key)
}

fn encrypt(plain: &str) -> Result<String, String> {
    let mut nonce_bytes = [0u8; 12];
    getrandom::fill(&mut nonce_bytes).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher()
        .encrypt(nonce, plain.as_bytes())
        .map_err(|e| e.to_string())?;
    let mut blob = nonce_bytes.to_vec();
    blob.extend_from_slice(&ct);
    Ok(base64::engine::general_purpose::STANDARD.encode(blob))
}

fn decrypt(b64: &str) -> Result<String, String> {
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

fn read_store(dir: &Path) -> Store {
    std::fs::read_to_string(store_path(dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_store(dir: &Path, store: &Store) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string(store).map_err(|e| e.to_string())?;
    std::fs::write(store_path(dir), json).map_err(|e| e.to_string())
}

/// 로그인명 + 토큰 저장(토큰은 암호화).
pub fn save_github(dir: &Path, login: &str, token: &str) -> Result<(), String> {
    let store = Store {
        login: Some(login.to_string()),
        token_enc: Some(encrypt(token)?),
    };
    write_store(dir, &store)
}

pub fn load_github_token(dir: &Path) -> Option<String> {
    read_store(dir).token_enc.and_then(|e| decrypt(&e).ok())
}

pub fn load_github_login(dir: &Path) -> Option<String> {
    read_store(dir).login
}

pub fn clear_github(dir: &Path) -> Result<(), String> {
    let p = store_path(dir);
    if p.exists() {
        std::fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}
