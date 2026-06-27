/** GitHub 계정/등록 저장소 상태. 토큰은 Rust(암호화)에 보관, 여기엔 없음. */
import { create } from "zustand";
import {
  githubLogin,
  githubLogout,
  githubStatus,
  githubDefaultBranch,
  githubListRepos,
} from "../sources/githubSource";
import type { RepoInfo } from "../sources/githubSource";

export interface RegisteredRepo {
  ownerRepo: string; // "owner/repo"
  branch: string | null;
}

const REPOS_KEY = "github.repos.v1";

function loadRepos(): RegisteredRepo[] {
  try {
    const raw = localStorage.getItem(REPOS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveRepos(repos: RegisteredRepo[]) {
  try {
    localStorage.setItem(REPOS_KEY, JSON.stringify(repos));
  } catch {
    /* ignore */
  }
}

interface GithubState {
  login: string | null;
  repos: RegisteredRepo[];
  busy: boolean;
  error: string | null;
  /** 로그인 계정이 접근 가능한 저장소 목록(선택 추가용) */
  available: RepoInfo[];
  loadingAvailable: boolean;

  init: () => Promise<void>;
  signIn: (token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  addRepo: (ownerRepo: string, branch?: string | null) => Promise<boolean>;
  removeRepo: (ownerRepo: string) => void;
  fetchAvailable: () => Promise<void>;
}

export const useGithub = create<GithubState>((set, get) => ({
  login: null,
  repos: loadRepos(),
  busy: false,
  error: null,
  available: [],
  loadingAvailable: false,

  init: async () => {
    try {
      const login = await githubStatus();
      set({ login });
      if (login) void get().fetchAvailable();
    } catch {
      /* ignore */
    }
  },

  fetchAvailable: async () => {
    if (!get().login) return;
    set({ loadingAvailable: true });
    try {
      set({ available: await githubListRepos(), loadingAvailable: false });
    } catch (e) {
      set({ loadingAvailable: false, error: String(e) });
    }
  },

  signIn: async (token) => {
    set({ busy: true, error: null });
    try {
      const login = await githubLogin(token.trim());
      set({ login, busy: false });
      void get().fetchAvailable();
      return true;
    } catch (e) {
      set({ busy: false, error: String(e) });
      return false;
    }
  },

  signOut: async () => {
    await githubLogout().catch(() => {});
    set({ login: null, available: [] });
  },

  addRepo: async (ownerRepo, branch) => {
    const repo = ownerRepo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
    if (!/^[^/]+\/[^/]+$/.test(repo)) {
      set({ error: "owner/repo 형식으로 입력하세요" });
      return false;
    }
    set({ busy: true, error: null });
    try {
      let b = branch?.trim() || null;
      if (!b) b = await githubDefaultBranch(repo).catch(() => null);
      const repos = get().repos.filter((r) => r.ownerRepo !== repo);
      repos.unshift({ ownerRepo: repo, branch: b });
      saveRepos(repos);
      set({ repos, busy: false });
      return true;
    } catch (e) {
      set({ busy: false, error: String(e) });
      return false;
    }
  },

  removeRepo: (ownerRepo) => {
    const repos = get().repos.filter((r) => r.ownerRepo !== ownerRepo);
    saveRepos(repos);
    set({ repos });
  },
}));
