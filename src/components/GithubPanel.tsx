/** GitHub 패널 — PAT 로그인, 저장소 등록/열기. */
import { useEffect, useState } from "react";
import { useGithub } from "../store/github";
import { useViewer } from "../store/viewer";
import { GithubSource } from "../sources/githubSource";

export function GithubPanel() {
  const { login, repos, busy, error, init, signIn, signOut, addRepo, removeRepo } =
    useGithub();
  const openSource = useViewer((s) => s.openSource);

  const [token, setToken] = useState("");
  const [repoInput, setRepoInput] = useState("");

  useEffect(() => {
    void init();
  }, [init]);

  const openRepo = (ownerRepo: string, branch: string | null) => {
    openSource(new GithubSource(ownerRepo, branch));
  };

  return (
    <div className="gh-panel">
      <div className="panel-title">GitHub</div>

      {/* 공개 저장소는 로그인 없이 바로 추가/열람. 비공개/요청한도는 PAT 로그인. */}
      <form
        className="gh-addrepo"
        onSubmit={(e) => {
          e.preventDefault();
          if (repoInput.trim())
            void addRepo(repoInput).then((ok) => ok && setRepoInput(""));
        }}
      >
        <input
          placeholder="owner/repo 추가 (공개는 로그인 불필요)"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
        />
        <button type="submit" disabled={busy || !repoInput.trim()}>
          +
        </button>
      </form>

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

      {error && <div className="gh-error">{error}</div>}

      <ul className="gh-repos">
        {repos.map((r) => (
          <li key={r.ownerRepo}>
            <button
              className="gh-repo"
              onClick={() => openRepo(r.ownerRepo, r.branch)}
              title={`${r.ownerRepo}${r.branch ? "@" + r.branch : ""} 열기`}
            >
              📦 {r.ownerRepo}
              {r.branch && <span className="gh-branch">@{r.branch}</span>}
            </button>
            <button
              className="gh-remove"
              onClick={() => removeRepo(r.ownerRepo)}
              title="제거"
            >
              ×
            </button>
          </li>
        ))}
        {repos.length === 0 && <li className="gh-empty">등록된 저장소가 없습니다</li>}
      </ul>
    </div>
  );
}
