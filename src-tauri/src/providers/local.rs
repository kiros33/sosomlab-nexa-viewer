//! 로컬 파일 시스템 provider.

use std::path::{Component, Path, PathBuf};

use super::{ContentProvider, FileContent, ProviderResult, SourceRef, TreeEntry};

pub struct LocalProvider;

impl LocalProvider {
    /// root 아래로 상대 경로를 안전하게 해석한다(경로 탈출 방지).
    fn resolve(ctx: &SourceRef, rel: &str) -> ProviderResult<PathBuf> {
        let root = PathBuf::from(&ctx.root);
        let mut out = root.clone();
        for comp in Path::new(rel).components() {
            match comp {
                Component::Normal(c) => out.push(c),
                Component::CurDir => {}
                Component::ParentDir => return Err("상위 경로 접근은 허용되지 않습니다".into()),
                _ => return Err("잘못된 경로입니다".into()),
            }
        }
        Ok(out)
    }
}

#[async_trait::async_trait]
impl ContentProvider for LocalProvider {
    fn kind(&self) -> &'static str {
        "local"
    }

    async fn list_dir(&self, ctx: &SourceRef, path: &str) -> ProviderResult<Vec<TreeEntry>> {
        let dir = Self::resolve(ctx, path)?;
        let root = PathBuf::from(&ctx.root);
        let mut entries = Vec::new();

        let rd = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for e in rd {
            let e = e.map_err(|e| e.to_string())?;
            let name = e.file_name().to_string_lossy().to_string();
            // 숨김 파일/폴더 제외(.git, .DS_Store 등)
            if name.starts_with('.') {
                continue;
            }
            let p = e.path();
            let is_dir = p.is_dir();
            let rel = p
                .strip_prefix(&root)
                .unwrap_or(&p)
                .to_string_lossy()
                .replace('\\', "/");
            entries.push(TreeEntry { name, path: rel, is_dir });
        }

        // 디렉터리 먼저, 그 안에서 이름 오름차순(대소문자 무시).
        entries.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        Ok(entries)
    }

    async fn read_file(&self, ctx: &SourceRef, path: &str) -> ProviderResult<FileContent> {
        let f = Self::resolve(ctx, path)?;
        let text = std::fs::read_to_string(&f).map_err(|e| e.to_string())?;
        Ok(FileContent {
            path: path.to_string(),
            text,
        })
    }

    async fn read_asset(&self, ctx: &SourceRef, path: &str) -> ProviderResult<Vec<u8>> {
        let f = Self::resolve(ctx, path)?;
        std::fs::read(&f).map_err(|e| e.to_string())
    }
}
