/** GitHub 계정 상태. 토큰은 Rust(OS 키체인)에 보관, 여기엔 없음. 등록 저장소는 viewer.workspaces. */
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
  /** 안내 메시지(오류 아님) — 예: 키체인 없음으로 이번 실행 동안만 로그인 유지 */
  notice: string | null;
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
  notice: null,
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
    set({ busy: true, error: null, notice: null });
    try {
      const { login, persisted } = await githubLogin(token.trim());
      set({
        login,
        busy: false,
        notice: persisted
          ? null
          : "OS 키체인을 사용할 수 없어 토큰을 저장하지 않았습니다 — 앱을 다시 시작하면 다시 로그인해야 합니다.",
      });
      void get().fetchAvailable();
      return true;
    } catch (e) {
      set({ busy: false, error: String(e) });
      return false;
    }
  },

  signOut: async () => {
    await githubLogout().catch(() => {});
    set({ login: null, available: [], notice: null });
  },

  setError: (e) => set({ error: e }),
}));
