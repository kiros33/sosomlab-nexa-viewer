/**
 * GitHub 패널
 *  - 상단: 계정 + 등록된 저장소 목록(관리: ⋯ 표시/숨김·삭제)
 *  - 하단: 독립된 "저장소 검색 & 추가" 영역(검색창은 새로고침 제외 전체 폭)
 */
import { useEffect, useState } from "react";
import { useGithub } from "../store/github";
import { useViewer } from "../store/viewer";
import { GithubSource, githubDefaultBranch } from "../sources/githubSource";
import type { RepoInfo } from "../sources/githubSource";
import type { SourceRef } from "../sources/types";
import { sourceKey } from "../sources/registry";
import { GithubMark } from "./GithubMark";

/** 등록된 저장소 한 줄 — 이름 넓게, 관리는 ⋯ 뒤로. */
function RegisteredRow({ wsRef }: { wsRef: SourceRef }) {
  const key = sourceKey(wsRef);
  const hidden = useViewer((s) => s.hiddenKeys.includes(key));
  const toggleHidden = useViewer((s) => s.toggleHidden);
  const removeWorkspace = useViewer((s) => s.removeWorkspace);
  const [menu, setMenu] = useState(false);
  const label = wsRef.gitRef ? `${wsRef.root}@${wsRef.gitRef}` : wsRef.root;

  return (
    <li className={`gh-reg-row${hidden ? " dim" : ""}`}>
      <span className="gh-reg-name" title={label}>
        <GithubMark size={13} /> {wsRef.root}
        {wsRef.gitRef && <span className="gh-branch">@{wsRef.gitRef}</span>}
        {hidden && <span className="gh-hidden-dot" title="탐색기에서 숨김">🚫</span>}
      </span>
      <div className="gh-kebab-wrap">
        <button className="gh-kebab" onClick={() => setMenu((m) => !m)} title="설정">
          ⋯
        </button>
        {menu && (
          <>
            <div className="gh-menu-backdrop" onClick={() => setMenu(false)} />
            <div className="gh-menu">
              <button
                onClick={() => {
                  toggleHidden(key);
                  setMenu(false);
                }}
              >
                {hidden ? "👁 탐색기에 표시" : "🚫 탐색기에서 숨김"}
              </button>
              <button
                className="gh-menu-danger"
                onClick={() => {
                  removeWorkspace(key);
                  setMenu(false);
                }}
              >
                🗑 삭제
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/** 검색 결과(계정 저장소) 한 줄 — 추가 버튼. */
function AvailRow({
  repo,
  added,
  onAdd,
}: {
  repo: RepoInfo;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <li className="gh-avail-row">
      <span className="gh-avail-name" title={repo.fullName}>
        {repo.isPrivate ? "🔒" : "📂"} {repo.fullName}
      </span>
      <button className="gh-add-btn" disabled={added} onClick={onAdd}>
        {added ? "추가됨" : "추가"}
      </button>
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
  const showSidebarView = useViewer((s) => s.showSidebarView);
  const workspaces = useViewer((s) => s.workspaces);

  const [token, setToken] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  const githubWorkspaces = workspaces.filter((w) => w.kind === "github");
  const registered = new Set(githubWorkspaces.map((w) => sourceKey(w)));

  const addRepo = (ownerRepo: string, branch: string | null) => {
    addWorkspace(new GithubSource(ownerRepo, branch).ref);
    showSidebarView("files");
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

      {/* 계정 */}
      {login ? (
        <div className="gh-account">
          <span>👤 {login}</span>
          <button className="gh-link" onClick={() => void signOut()}>
            로그아웃
          </button>
        </div>
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

      {/* 등록된 저장소 */}
      <div className="gh-section-title">등록된 저장소 ({githubWorkspaces.length})</div>
      <ul className="gh-registered">
        {githubWorkspaces.map((w) => (
          <RegisteredRow key={sourceKey(w)} wsRef={w} />
        ))}
        {githubWorkspaces.length === 0 && (
          <li className="gh-empty">아래에서 저장소를 추가하세요</li>
        )}
      </ul>

      {/* 저장소 검색 & 추가 (독립 영역) */}
      <div className="gh-addbox">
        <div className="gh-section-title">🔎 저장소 검색 &amp; 추가</div>

        {login && (
          <>
            <div className="gh-pick-head">
              <input
                className="gh-search"
                placeholder="내 저장소 검색…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button className="gh-refresh-sm" onClick={() => void fetchAvailable()} title="목록 새로고침">
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
                      <AvailRow
                        key={r.fullName}
                        repo={r}
                        added={registered.has(key)}
                        onAdd={() => addRepo(r.fullName, r.defaultBranch)}
                      />
                    );
                  })}
                {available.length === 0 && (
                  <li className="gh-empty">접근 가능한 저장소가 없습니다</li>
                )}
              </ul>
            )}
          </>
        )}

        <form
          className="gh-addrepo"
          onSubmit={(e) => {
            e.preventDefault();
            if (repoInput.trim()) void onManualAdd();
          }}
        >
          <input
            placeholder="owner/repo 직접 추가 (공개는 로그인 불필요)"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
          />
          <button type="submit" disabled={adding || !repoInput.trim()}>
            {adding ? "…" : "+"}
          </button>
        </form>
      </div>

      {error && <div className="gh-error">{error}</div>}
    </div>
  );
}
