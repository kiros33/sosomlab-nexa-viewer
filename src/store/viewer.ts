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
  /** 탐색기에서 마크다운 외 전체 파일도 표시할지 */
  showAllFiles: boolean;
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
    showAllFiles: false, // 기본: 마크다운만
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

// 탐색기에 표시할 등록 소스(워크스페이스) 목록 — 로컬 폴더 + GitHub 저장소
const WORKSPACES_KEY = "workspaces.v1";

function loadWorkspaces(): SourceRef[] {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveWorkspaces(ws: SourceRef[]) {
  try {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(ws));
  } catch {
    /* ignore */
  }
}

// 탐색기에서 숨긴 워크스페이스 key 목록
const HIDDEN_KEY = "hidden.v1";

function loadHidden(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveHidden(keys: string[]) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

// 탐색기에서 펼쳐진 워크스페이스 key 목록(접힘이 기본)
const EXPANDED_KEY = "expanded.v1";

function loadExpanded(): string[] {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveExpanded(keys: string[]) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(keys));
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

  // 갱신 감지(원격)
  /** 현재 열린 문서의 버전(sha 등) */
  currentVersion: string | null;
  /** 온라인에 더 새 버전이 있는지 */
  updateAvailable: boolean;
  /** 원격 최신 버전과 비교해 갱신 여부 갱신 */
  checkForUpdate: () => Promise<void>;
  /** 현재 문서를 강제로 다시 불러옴(기록 변경 없음) */
  reload: () => Promise<void>;

  // 레이아웃(패널 표시/너비)
  sidebarVisible: boolean;
  tocVisible: boolean;
  sidebarWidth: number;
  tocWidth: number;
  /** 사이드바에 표시할 뷰 */
  sidebarView: "files" | "github";
  toggleSidebar: () => void;
  toggleToc: () => void;
  /** 뷰 선택(+사이드바 표시). 활성 뷰 재클릭 시 숨김. */
  showSidebarView: (view: "files" | "github") => void;
  /** 탐색기 전체 파일 표시 여부 */
  showAllFiles: boolean;
  toggleShowAllFiles: () => void;
  /** 드래그 중 증분(dx)으로 너비 조절 */
  resizeSidebar: (dx: number) => void;
  resizeToc: (dx: number) => void;
  /** 드래그 종료 시 너비 영속화 */
  commitLayout: () => void;

  // 탐색기 다중 루트(등록된 소스)
  workspaces: SourceRef[];
  addWorkspace: (ref: SourceRef) => void;
  removeWorkspace: (key: string) => void;
  /** 탐색기에서 숨긴 워크스페이스 key */
  hiddenKeys: string[];
  toggleHidden: (key: string) => void;
  /** 탐색기에서 펼쳐진 워크스페이스 key (접힘이 기본) */
  expandedKeys: string[];
  toggleExpanded: (key: string) => void;

  openSource: (source: ContentSource) => void;
  /** 특정 소스의 문서를 연다(필요 시 활성 소스 전환). */
  openInSource: (source: ContentSource, path: string) => Promise<void>;
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
    opts: {
      pushHistory: boolean;
      indexOverride?: number;
      hash?: string | null;
      force?: boolean;
    },
  ) {
    const hash = opts.hash ?? null;
    set({ loading: true, error: null });
    try {
      // 같은 파일이면 재로딩 없이 앵커만 이동(force면 항상 재로딩)
      const cur = get();
      const sameFile =
        !opts.force &&
        cur.docPath === path &&
        cur.source != null &&
        sourceKey(cur.source.ref) === sourceKey(source.ref);

      let markdown = cur.markdown;
      let version = cur.currentVersion;
      if (!sameFile) {
        const file = await source.readFile(path);
        markdown = file.text;
        version = file.version ?? null;
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
        currentVersion: version,
        updateAvailable: sameFile ? get().updateAvailable : false,
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
    currentVersion: null,
    updateAvailable: false,

    checkForUpdate: async () => {
      const { source, docPath, currentVersion } = get();
      if (!source || !docPath || !currentVersion) return;
      try {
        const latest = await source.latestVersion(docPath);
        if (latest && latest !== currentVersion) set({ updateAvailable: true });
      } catch {
        /* 네트워크 오류 무시 */
      }
    },

    reload: async () => {
      const { source, docPath, historyIndex } = get();
      if (!source || !docPath) return;
      await load(source, docPath, {
        pushHistory: false,
        indexOverride: historyIndex,
        force: true,
      });
    },

    sidebarVisible: prefs.sidebarVisible,
    tocVisible: prefs.tocVisible,
    sidebarWidth: prefs.sidebarWidth,
    tocWidth: prefs.tocWidth,
    sidebarView: "files",

    toggleSidebar: () => {
      set((s) => ({ sidebarVisible: !s.sidebarVisible }));
      persist(get);
    },
    toggleToc: () => {
      set((s) => ({ tocVisible: !s.tocVisible }));
      persist(get);
    },
    showSidebarView: (view) => {
      const s = get();
      if (s.sidebarVisible && s.sidebarView === view) {
        set({ sidebarVisible: false });
      } else {
        set({ sidebarVisible: true, sidebarView: view });
      }
      persist(get);
    },
    showAllFiles: prefs.showAllFiles,
    toggleShowAllFiles: () => {
      set((s) => ({ showAllFiles: !s.showAllFiles }));
      persist(get);
    },
    resizeSidebar: (dx) =>
      set((s) => ({ sidebarWidth: clamp(s.sidebarWidth + dx, SIDEBAR_MIN, SIDEBAR_MAX) })),
    resizeToc: (dx) =>
      set((s) => ({ tocWidth: clamp(s.tocWidth - dx, TOC_MIN, TOC_MAX) })),
    commitLayout: () => persist(get),

    workspaces: loadWorkspaces(),

    addWorkspace: (ref) => {
      const key = sourceKey(ref);
      const ws = get().workspaces.filter((w) => sourceKey(w) !== key);
      ws.unshift(ref);
      saveWorkspaces(ws);
      set({ workspaces: ws });
    },

    removeWorkspace: (key) => {
      const ws = get().workspaces.filter((w) => sourceKey(w) !== key);
      saveWorkspaces(ws);
      const expandedKeys = get().expandedKeys.filter((k) => k !== key);
      const hiddenKeys = get().hiddenKeys.filter((k) => k !== key);
      saveExpanded(expandedKeys);
      saveHidden(hiddenKeys);
      set({ workspaces: ws, expandedKeys, hiddenKeys });
    },

    hiddenKeys: loadHidden(),

    toggleHidden: (key) => {
      const cur = get().hiddenKeys;
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      saveHidden(next);
      set({ hiddenKeys: next });
    },

    expandedKeys: loadExpanded(),

    toggleExpanded: (key) => {
      const cur = get().expandedKeys;
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      saveExpanded(next);
      set({ expandedKeys: next });
    },

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

    openInSource: async (source, path) => {
      const cur = get().source;
      if (!cur || sourceKey(cur.ref) !== sourceKey(source.ref)) {
        // 소스 전환: docPath/markdown을 비워 같은 이름 파일이라도 강제로 다시 로드
        set({ source, docPath: null, markdown: "", history: [], historyIndex: -1 });
      }
      await get().openDoc(path);
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
  const { theme, profileId, recent, sidebarVisible, tocVisible, sidebarWidth, tocWidth, showAllFiles } =
    get();
  savePrefs({
    theme,
    profileId,
    recent,
    sidebarVisible,
    tocVisible,
    sidebarWidth,
    tocWidth,
    showAllFiles,
  });
}
