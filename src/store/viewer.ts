/** 뷰어 전역 상태 (zustand). */
import { create } from "zustand";

import type { ContentSource, SourceRef } from "../sources/types";
import { sourceFromRef, sourceKey } from "../sources/registry";
import { defaultProfileId } from "../renderer/profiles";
import type { FileFilters } from "../lib/filetypes";
import { DEFAULT_FILTERS } from "../lib/filetypes";

const DEFAULT_PLAIN_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Noto Sans Mono", monospace';

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
  /** 이 문서를 떠날 때의 스크롤 위치(뒤로/앞으로 시 복원) */
  scroll?: number;
}

interface PersistedPrefs {
  theme: Theme;
  profileId: string;
  recent: RecentItem[];
  sidebarVisible: boolean;
  tocVisible: boolean;
  sidebarWidth: number;
  tocWidth: number;
  /** 탐색기 파일 표시 필터(카테고리별) — 전역 기본값 */
  filters: FileFilters;
  /** 저장소(워크스페이스)별 필터 override(없으면 전역 filters 사용) */
  filterOverrides: Record<string, FileFilters>;
  /** 일반텍스트/코드 파일 글꼴 */
  plainFontFamily: string;
  /** 일반텍스트/코드 파일 기본 글꼴 크기(px) */
  plainFontSize: number;
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
    filters: DEFAULT_FILTERS, // 기본: 마크다운만
    filterOverrides: {},
    plainFontFamily: DEFAULT_PLAIN_FONT,
    plainFontSize: 14,
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
  /** 이동 후 복원할 스크롤 위치(px). null이면 앵커/처음 규칙 사용 */
  pendingScroll: number | null;
  /** 현재 본문 스크롤 위치(네비게이션 시 떠나는 엔트리에 저장) */
  currentScroll: number;
  /** 본문 스크롤 시 호출(현재 위치 갱신) */
  noteScroll: (top: number) => void;
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
  /** 탐색기 파일 표시 필터(전역). 변경 시 모든 저장소에 일괄 적용(개별 override 초기화) */
  filters: FileFilters;
  setFilters: (patch: Partial<FileFilters>) => void;
  /** 저장소별 필터 override */
  filterOverrides: Record<string, FileFilters>;
  /** 특정 저장소의 필터를 개별 설정(override) */
  setSourceFilter: (key: string, patch: Partial<FileFilters>) => void;
  /** 저장소의 유효 필터(override 우선, 없으면 전역) */
  effectiveFilters: (key: string) => FileFilters;
  /** 일반텍스트 글꼴/크기 */
  plainFontFamily: string;
  plainFontSize: number;
  setPlainFontFamily: (family: string) => void;
  setPlainFontSize: (size: number) => void;
  adjustPlainFontSize: (delta: number) => void;
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
  /** 워크스페이스별 트리 갱신 카운터(증가 시 해당 트리 재로딩) */
  refreshTicks: Record<string, number>;
  bumpRefresh: (key: string) => void;

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

      let history = cur.history.slice();
      let historyIndex = cur.historyIndex;
      // 떠나는 현재 엔트리에 스크롤 위치 저장
      if (historyIndex >= 0 && history[historyIndex]) {
        history[historyIndex] = { ...history[historyIndex], scroll: cur.currentScroll };
      }
      let pendingScroll: number | null = null;

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
        pendingScroll = null; // 새 이동: 앵커/처음 규칙
      } else if (opts.indexOverride !== undefined) {
        historyIndex = opts.indexOverride;
        // 뒤로/앞으로: 저장된 스크롤 복원
        pendingScroll = history[historyIndex]?.scroll ?? null;
      }

      const recent = pushRecent(cur.recent, source, path);
      set({
        markdown,
        docPath: path,
        loading: false,
        history,
        historyIndex,
        recent,
        pendingHash: hash,
        pendingScroll,
        navSeq: cur.navSeq + 1,
        currentVersion: version,
        updateAvailable: sameFile ? cur.updateAvailable : false,
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
    pendingScroll: null,
    currentScroll: 0,
    noteScroll: (top) => set({ currentScroll: top }),
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
    filters: prefs.filters,
    filterOverrides: prefs.filterOverrides,
    setFilters: (patch) => {
      // 전역 변경 → 모든 저장소에 일괄 적용(개별 override 초기화)
      set((s) => ({ filters: { ...s.filters, ...patch }, filterOverrides: {} }));
      persist(get);
    },
    setSourceFilter: (key, patch) => {
      set((s) => {
        const base = s.filterOverrides[key] ?? s.filters;
        return { filterOverrides: { ...s.filterOverrides, [key]: { ...base, ...patch } } };
      });
      persist(get);
    },
    effectiveFilters: (key) => {
      const s = get();
      return s.filterOverrides[key] ?? s.filters;
    },
    plainFontFamily: prefs.plainFontFamily,
    plainFontSize: prefs.plainFontSize,
    setPlainFontFamily: (family) => {
      set({ plainFontFamily: family });
      persist(get);
    },
    setPlainFontSize: (size) => {
      set({ plainFontSize: clamp(size, 8, 48) });
      persist(get);
    },
    adjustPlainFontSize: (delta) => {
      set((s) => ({ plainFontSize: clamp(s.plainFontSize + delta, 8, 48) }));
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

    refreshTicks: {},

    bumpRefresh: (key) => {
      set((s) => ({
        refreshTicks: { ...s.refreshTicks, [key]: (s.refreshTicks[key] ?? 0) + 1 },
      }));
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
  const {
    theme,
    profileId,
    recent,
    sidebarVisible,
    tocVisible,
    sidebarWidth,
    tocWidth,
    filters,
    filterOverrides,
    plainFontFamily,
    plainFontSize,
  } = get();
  savePrefs({
    theme,
    profileId,
    recent,
    sidebarVisible,
    tocVisible,
    sidebarWidth,
    tocWidth,
    filters,
    filterOverrides,
    plainFontFamily,
    plainFontSize,
  });
}
