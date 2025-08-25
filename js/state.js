// State module: centralizes URL/localStorage, history, and UI state.
// Exposes default state and helpers for reading/writing/applying state.

export const DEFAULT_STATE = {
  species: "all",
  area: "all",
  layout: "force-directed",
  search: "",
  tierStart: "0",
  tierEnd: "11",
  focus: null,
  performanceMode: true,
};

export const appState = {
  layout: DEFAULT_STATE.layout,
};

export function loadState() {
  const urlParams = new URLSearchParams(window.location.search);
  const stateFromUrl = {
    layout: urlParams.get("layout"),
    species: urlParams.get("species"),
    area: urlParams.get("area"),
    search: urlParams.get("search"),
    tierStart: urlParams.get("tierStart"),
    tierEnd: urlParams.get("tierEnd"),
    focus: urlParams.get("focus"),
  };

  const hasUrlParams = Object.values(stateFromUrl).some(v => v !== null);
  if (hasUrlParams) {
    return {
      layout: stateFromUrl.layout || DEFAULT_STATE.layout,
      species: stateFromUrl.species || DEFAULT_STATE.species,
      area: stateFromUrl.area || DEFAULT_STATE.area,
      search: stateFromUrl.search || DEFAULT_STATE.search,
      tierStart: stateFromUrl.tierStart || DEFAULT_STATE.tierStart,
      tierEnd: stateFromUrl.tierEnd || DEFAULT_STATE.tierEnd,
      focus: stateFromUrl.focus || null,
      performanceMode: DEFAULT_STATE.performanceMode,
    };
  }

  try {
    const raw = localStorage.getItem("techTreeState");
    const parsed = raw ? JSON.parse(raw) : DEFAULT_STATE;
    if (parsed.performanceMode === undefined) parsed.performanceMode = true;
    return parsed;
  } catch (e) {
    console.warn("Could not load saved state:", e);
    return DEFAULT_STATE;
  }
}

export function saveState() {
  const state = {
    species: document.getElementById("species-select").value,
    area: document.getElementById("area-select").value,
    layout: document.getElementById("layout-select").value,
    search: document.getElementById("search-input").value,
    tierStart: document.getElementById("start-tier-select").value,
    tierEnd: document.getElementById("end-tier-select").value,
    focus: window.currentFocusId || null,
    performanceMode: !!document.getElementById("performance-toggle")?.checked,
  };
  try {
    localStorage.setItem("techTreeState", JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save state:", e);
  }
}

export function applyState(state) {
  document.getElementById("species-select").value = state.species || 'Federation';
  document.getElementById("area-select").value = state.area;
  document.getElementById("layout-select").value = state.layout;
  document.getElementById("search-input").value = state.search;
  document.getElementById("start-tier-select").value = state.tierStart;
  document.getElementById("end-tier-select").value = state.tierEnd;
  const perf = document.getElementById("performance-toggle");
  if (perf) perf.checked = state.performanceMode ?? true;
}

export function resetState() {
  localStorage.removeItem("techTreeState");
  window.location.search = '';
}

// Cookie helpers for simple persistence outside of state object when needed
export function setCookie(name, value, days) {
  const expires = days ? '; expires=' + new Date(Date.now() + days * 864e5).toUTCString() : '';
  document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
}

export function getCookie(name) {
  const prefix = name + '=';
  const parts = document.cookie.split('; ');
  for (const part of parts) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return null;
}
