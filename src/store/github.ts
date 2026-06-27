/** GitHub 계정 상태. 토큰은 Rust(암호화)에 보관, 여기엔 없음. 등록 저장소는 viewer.workspaces. */
import { create } from "zustand";
import {
  githubLogin,
  githubLogout,
  githubStatus,
  githubListRepos,
} from "../sources/githubSource";
import type { RepoInfo } from "../sources/githubSource";

interface GithubState {
  login: string | null;
  busy: boolean;
  error: string | null;
  /** 로그인 계정이 접근 가능한 저장소 목록(선택 추가용) */
  available: RepoInfo[];
  loadingAvailable: boolean;

  init: () => Promise<void>;
  signIn: (token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  fetchAvailable: () => Promise<void>;
  setError: (e: string | null) => void;
}

export const useGithub = create<GithubState>((set, get) => ({
  login: null,
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

  setError: (e) => set({ error: e }),
}));
