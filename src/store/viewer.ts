/** 뷰어 전역 상태 (zustand). */
import { create } from "zustand";

import type { ContentSource, SourceRef } from "../sources/types";
import { sourceFromRef, sourceKey } from "../sources/registry";
import { defaultProfileId } from "../renderer/profiles";

export type Theme = "light" | "dark";

export interface RecentItem {
  ref: SourceRef;
  path: string;
  label: string; // "repo · file.md"
  openedAt: number;
}

/**
 * 이동(네비게이션) 기록 항목 — 파일 + 앵커(#) 단위.
 *  - hash: 문서 내 헤딩 id(앵커). null이면 문서 처음.
 */
export interface HistoryEntry {
  ref: SourceRef;
  path: string;
  hash: string | null;
  title: string; // 파일명
}

interface PersistedPrefs {
  theme: Theme;
  profileId: string;
  recent: RecentItem[];
  sidebarVisible: boolean;
  tocVisible: boolean;
  sidebarWidth: number;
  tocWidth: number;
}

const PREFS_KEY = "viewer.prefs.v1";

const LAYOUT_DEFAULTS = {
  sidebarVisible: true,
  tocVisible: true,
  sidebarWidth: 260,
  tocWidth: 220,
};
export const SIDEBAR_MIN = 180;
export const SIDEBAR_MAX = 560;
export const TOC_MIN = 160;
export const TOC_MAX = 480;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function loadPrefs(): PersistedPrefs {
  const defaults: PersistedPrefs = {
    theme: "light",
    profileId: defaultProfileId,
    recent: [],
    ...LAYOUT_DEFAULTS,
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults;
}

function savePrefs(prefs: PersistedPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

interface ViewerState {
  source: ContentSource | null;
  docPath: string | null;
  markdown: string;
  theme: Theme;
  profileId: string;
  recent: RecentItem[];
  history: HistoryEntry[];
  historyIndex: number;
  /** 이동 후 스크롤할 앵커(null=문서 처음) */
  pendingHash: string | null;
  /** 이동 시퀀스 — 같은 앵커 재이동도 스크롤 트리거되게 하는 카운터 */
  navSeq: number;
  loading: boolean;
  error: string | null;

  // 레이아웃(패널 표시/너비)
  sidebarVisible: boolean;
  tocVisible: boolean;
  sidebarWidth: number;
  tocWidth: number;
  toggleSidebar: () => void;
  toggleToc: () => void;
  /** 드래그 중 증분(dx)으로 너비 조절 */
  resizeSidebar: (dx: number) => void;
  resizeToc: (dx: number) => void;
  /** 드래그 종료 시 너비 영속화 */
  commitLayout: () => void;

  openSource: (source: ContentSource) => void;
  /** 현재 소스에서 문서 열기(이동 기록 push). hash 지정 시 해당 앵커로 */
  openDoc: (path: string, hash?: string | null) => Promise<void>;
  /** 같은 문서 내 앵커 이동(기록 push, 재로딩 없음) */
  navigateAnchor: (hash: string) => Promise<void>;
  openRecent: (item: RecentItem) => Promise<void>;
  /** 이동 기록의 특정 위치로 점프(push 안 함) */
  goTo: (index: number) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  toggleTheme: () => void;
  setProfile: (id: string) => void;
}

const prefs = loadPrefs();

export const useViewer = create<ViewerState>((set, get) => {
  async function load(
    source: ContentSource,
    path: string,
    opts: { pushHistory: boolean; indexOverride?: number; hash?: string | null },
  ) {
    const hash = opts.hash ?? null;
    set({ loading: true, error: null });
    try {
      // 같은 파일이면 재로딩 없이 앵커만 이동
      const cur = get();
      const sameFile =
        cur.docPath === path &&
        cur.source != null &&
        sourceKey(cur.source.ref) === sourceKey(source.ref);

      let markdown = cur.markdown;
      if (!sameFile) {
        const file = await source.readFile(path);
        markdown = file.text;
      }
      const title = path.split("/").pop() ?? path;

      let { history, historyIndex } = get();
      if (opts.pushHistory) {
        const base = history.slice(0, historyIndex + 1);
        const last = base[base.length - 1];
        const isDup =
          last &&
          last.path === path &&
          (last.hash ?? null) === hash &&
          sourceKey(last.ref) === sourceKey(source.ref);
        if (!isDup) base.push({ ref: source.ref, path, hash, title });
        history = base;
        historyIndex = history.length - 1;
      } else if (opts.indexOverride !== undefined) {
        historyIndex = opts.indexOverride;
      }

      const recent = pushRecent(get().recent, source, path);
      set({
        markdown,
        docPath: path,
        loading: false,
        history,
        historyIndex,
        recent,
        pendingHash: hash,
        navSeq: get().navSeq + 1,
      });
      persist(get);
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  }

  return {
    source: null,
    docPath: null,
    markdown: "",
    theme: prefs.theme,
    profileId: prefs.profileId,
    recent: prefs.recent,
    history: [],
    historyIndex: -1,
    pendingHash: null,
    navSeq: 0,
    loading: false,
    error: null,

    sidebarVisible: prefs.sidebarVisible,
    tocVisible: prefs.tocVisible,
    sidebarWidth: prefs.sidebarWidth,
    tocWidth: prefs.tocWidth,

    toggleSidebar: () => {
      set((s) => ({ sidebarVisible: !s.sidebarVisible }));
      persist(get);
    },
    toggleToc: () => {
      set((s) => ({ tocVisible: !s.tocVisible }));
      persist(get);
    },
    resizeSidebar: (dx) =>
      set((s) => ({ sidebarWidth: clamp(s.sidebarWidth + dx, SIDEBAR_MIN, SIDEBAR_MAX) })),
    resizeToc: (dx) =>
      set((s) => ({ tocWidth: clamp(s.tocWidth - dx, TOC_MIN, TOC_MAX) })),
    commitLayout: () => persist(get),

    openSource: (source) => {
      set({
        source,
        docPath: null,
        markdown: "",
        error: null,
        history: [],
        historyIndex: -1,
        pendingHash: null,
      });
    },

    openDoc: async (path, hash) => {
      const { source } = get();
      if (!source) return;
      await load(source, path, { pushHistory: true, hash: hash ?? null });
    },

    navigateAnchor: async (hash) => {
      const { source, docPath } = get();
      if (!source || !docPath) return;
      await load(source, docPath, { pushHistory: true, hash });
    },

    openRecent: async (item) => {
      const source = sourceFromRef(item.ref);
      set({ source, history: [], historyIndex: -1 });
      await load(source, item.path, { pushHistory: true, hash: null });
    },

    goTo: async (index) => {
      const { history } = get();
      const entry = history[index];
      if (!entry) return;
      const source = get().source ?? sourceFromRef(entry.ref);
      if (!get().source) set({ source });
      await load(source, entry.path, {
        pushHistory: false,
        indexOverride: index,
        hash: entry.hash,
      });
    },

    goBack: async () => {
      const { historyIndex } = get();
      if (historyIndex > 0) await get().goTo(historyIndex - 1);
    },

    goForward: async () => {
      const { historyIndex, history } = get();
      if (historyIndex < history.length - 1) await get().goTo(historyIndex + 1);
    },

    toggleTheme: () => {
      set({ theme: get().theme === "light" ? "dark" : "light" });
      persist(get);
    },

    setProfile: (id) => {
      set({ profileId: id });
      persist(get);
    },
  };
});

function pushRecent(
  current: RecentItem[],
  source: ContentSource,
  path: string,
): RecentItem[] {
  const file = path.split("/").pop() ?? path;
  const item: RecentItem = {
    ref: source.ref,
    path,
    label: `${source.label} · ${file}`,
    openedAt: Date.now(),
  };
  const key = sourceKey(source.ref) + "#" + path;
  const rest = current.filter((r) => sourceKey(r.ref) + "#" + r.path !== key);
  return [item, ...rest].slice(0, 20);
}

function persist(get: () => ViewerState) {
  const { theme, profileId, recent, sidebarVisible, tocVisible, sidebarWidth, tocWidth } = get();
  savePrefs({ theme, profileId, recent, sidebarVisible, tocVisible, sidebarWidth, tocWidth });
}
