/** GitHub 패널 — PAT 로그인, 계정 저장소 선택/추가. 추가된 저장소는 탐색기에 표시. */
import { useEffect, useState } from "react";
import { useGithub } from "../store/github";
import { useViewer } from "../store/viewer";
import { GithubSource, githubDefaultBranch } from "../sources/githubSource";
import type { RepoInfo } from "../sources/githubSource";
import { sourceKey } from "../sources/registry";

/** 계정 저장소 한 줄 — 이름은 넓게, 설정(삭제/표시토글)은 ⋯ 뒤로 숨김. */
function AvailableItem({
  repo,
  added,
  hidden,
  onAdd,
  onRemove,
  onToggleHidden,
}: {
  repo: RepoInfo;
  added: boolean;
  hidden: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onToggleHidden: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <li className="gh-avail-row">
      <span className="gh-avail-name" title={repo.fullName}>
        {repo.isPrivate ? "🔒" : "📂"} {repo.fullName}
      </span>
      {added ? (
        <div className="gh-kebab-wrap">
          {hidden && <span className="gh-hidden-dot" title="탐색기에서 숨김">🚫</span>}
          <button className="gh-kebab" onClick={() => setMenu((m) => !m)} title="설정">
            ⋯
          </button>
          {menu && (
            <>
              <div className="gh-menu-backdrop" onClick={() => setMenu(false)} />
              <div className="gh-menu">
                <button
                  onClick={() => {
                    onToggleHidden();
                    setMenu(false);
                  }}
                >
                  {hidden ? "👁 탐색기에 표시" : "🚫 탐색기에서 숨김"}
                </button>
                <button
                  className="gh-menu-danger"
                  onClick={() => {
                    onRemove();
                    setMenu(false);
                  }}
                >
                  🗑 삭제
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button className="gh-add-btn" onClick={onAdd} title="추가">
          추가
        </button>
      )}
    </li>
  );
}

export function GithubPanel() {
  const {
    login,
    busy,
    error,
    available,
    loadingAvailable,
    init,
    signIn,
    signOut,
    fetchAvailable,
    setError,
  } = useGithub();
  const addWorkspace = useViewer((s) => s.addWorkspace);
  const removeWorkspace = useViewer((s) => s.removeWorkspace);
  const toggleHidden = useViewer((s) => s.toggleHidden);
  const showSidebarView = useViewer((s) => s.showSidebarView);
  const workspaces = useViewer((s) => s.workspaces);
  const hiddenKeys = useViewer((s) => s.hiddenKeys);

  const [token, setToken] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  const registered = new Set(
    workspaces.filter((w) => w.kind === "github").map((w) => sourceKey(w)),
  );

  const addRepo = (ownerRepo: string, branch: string | null) => {
    const src = new GithubSource(ownerRepo, branch);
    addWorkspace(src.ref);
    showSidebarView("files"); // 탐색기로 전환해 바로 보이게
  };

  const onManualAdd = async () => {
    const repo = repoInput
      .trim()
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "");
    if (!/^[^/]+\/[^/]+$/.test(repo)) {
      setError("owner/repo 형식으로 입력하세요");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const branch = await githubDefaultBranch(repo).catch(() => null);
      addRepo(repo, branch);
      setRepoInput("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="gh-panel">
      <div className="panel-title">GitHub</div>

      <form
        className="gh-addrepo"
        onSubmit={(e) => {
          e.preventDefault();
          if (repoInput.trim()) void onManualAdd();
        }}
      >
        <input
          placeholder="owner/repo 추가 (공개는 로그인 불필요)"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
        />
        <button type="submit" disabled={adding || !repoInput.trim()}>
          {adding ? "…" : "+"}
        </button>
      </form>

      {login ? (
        <>
          <div className="gh-account">
            <span>👤 {login}</span>
            <button className="gh-link" onClick={() => void signOut()}>
              로그아웃
            </button>
          </div>

          <div className="gh-pick">
            <div className="gh-pick-head">
              <input
                placeholder="내 저장소 검색…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button className="gh-link" onClick={() => void fetchAvailable()} title="목록 새로고침">
                ↻
              </button>
            </div>
            {loadingAvailable ? (
              <div className="gh-empty">불러오는 중…</div>
            ) : (
              <ul className="gh-available">
                {available
                  .filter((r) =>
                    r.fullName.toLowerCase().includes(filter.trim().toLowerCase()),
                  )
                  .slice(0, 50)
                  .map((r) => {
                    const key = sourceKey({
                      kind: "github",
                      root: r.fullName,
                      gitRef: r.defaultBranch,
                    });
                    return (
                      <AvailableItem
                        key={r.fullName}
                        repo={r}
                        added={registered.has(key)}
                        hidden={hiddenKeys.includes(key)}
                        onAdd={() => addRepo(r.fullName, r.defaultBranch)}
                        onRemove={() => removeWorkspace(key)}
                        onToggleHidden={() => toggleHidden(key)}
                      />
                    );
                  })}
                {available.length === 0 && (
                  <li className="gh-empty">접근 가능한 저장소가 없습니다</li>
                )}
              </ul>
            )}
          </div>
        </>
      ) : (
        <details className="gh-login-wrap">
          <summary>🔒 비공개 저장소 로그인 (PAT, 선택)</summary>
          <form
            className="gh-login"
            onSubmit={(e) => {
              e.preventDefault();
              if (token.trim()) void signIn(token).then((ok) => ok && setToken(""));
            }}
          >
            <input
              type="password"
              placeholder="Personal Access Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button type="submit" disabled={busy || !token.trim()}>
              {busy ? "확인 중…" : "로그인"}
            </button>
            <a
              className="gh-hint"
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noreferrer"
            >
              토큰 발급 (fine-grained, Contents: Read) · 공개 저장소엔 불필요
            </a>
          </form>
        </details>
      )}

      {error && <div className="gh-error">{error}</div>}
    </div>
  );
}
