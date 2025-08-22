// Attaches all DOM event handlers. Caller provides concrete elements, state accessors, and actions.
// This module is intentionally decoupled from globals; showcase.js wires dependencies.
// Usage:
//   attachEventHandlers({ elements, state, actions })
export function attachEventHandlers({ elements, state, actions }) {
  const {
    speciesSelect,
    speciesExclusiveToggle,
    searchInput,
    searchButton,
    searchBackButton,
    searchScopeToggle,
    techTreeContainer,
    tooltip,
    areaSelect,
    resetButton,
    showTierButton,
    techCounter,
    layoutSelect,
    copyBtn,
    landingCard,
    showTreeButton,
    treeToolbar,
    viewLegend,
    backButton,
    forwardButton,
    generalTab,
    detailsTab,
    generalPanel,
    detailsPanel,
    helpButton,
    helpViewport,
    helpCloseButton,
  } = elements;

  const {
    getActiveTechId,
    setTierFilterActive,
    getPreSearchState,
    setPreSearchState,
  } = state;

  const {
    updateVisualization,
    saveState,
    switchTab,
    getSelectedTierRange,
    renderGraph,
    runSearch,
    setCookie,
    calculateAndRenderPath,
    resetState,
  } = actions;

  // Tabs
  generalTab?.addEventListener('click', () => switchTab('general'));
  detailsTab?.addEventListener('click', () => switchTab('details'));

  // Share URL
  copyBtn?.addEventListener('click', () => {
    const focus = window.currentFocusId;
    const params = new URLSearchParams({
      layout: layoutSelect?.value || '',
      species: speciesSelect?.value || '',
      area: areaSelect?.value || '',
      tierStart: document.getElementById('start-tier-select')?.value || '',
      tierEnd: document.getElementById('end-tier-select')?.value || '',
    });
    if (focus) {
      params.set('focus', focus);
    } else {
      const search = searchInput?.value;
      if (search && search.trim() !== '') params.set('search', search);
    }
    const shareURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareURL).then(() => {
      alert(`Link ${focus ? 'to this Branch' : ''} copied to clipboard!\n\n${shareURL}`);
    }, (err) => alert('Copy URL failed: ' + err));
  });

  // Filters/layouts
  speciesSelect?.addEventListener('change', (e) => updateVisualization(e.target.value, getActiveTechId()));
  speciesExclusiveToggle?.addEventListener('change', () => updateVisualization(speciesSelect?.value, getActiveTechId()));
  areaSelect?.addEventListener('change', () => updateVisualization(speciesSelect?.value, getActiveTechId()));
  layoutSelect?.addEventListener('change', () => updateVisualization(speciesSelect?.value, getActiveTechId()));

  // Reload/Reset
  resetButton?.addEventListener('click', () => {
    if (typeof resetState === 'function') {
      resetState();
    } else {
      window.location.reload();
    }
  });

  // Search
  searchInput?.addEventListener('keydown', (event) => { if (event.key === 'Enter') actions.handleSearch?.(); });
  searchButton?.addEventListener('click', actions.handleSearch);
  searchBackButton?.addEventListener('click', () => actions.onSearchBack?.());

  // Tier filter
  showTierButton?.addEventListener('click', () => {
    const { startTier, endTier } = getSelectedTierRange();
    if (startTier > endTier) {
      alert('Start Tier cannot be higher than End Tier');
      return;
    }
    setTierFilterActive(true);
    updateVisualization(speciesSelect?.value, getActiveTechId());
  });

  // Save state on change
  ;['species-select','area-select','layout-select','search-input','start-tier-select','end-tier-select','performance-toggle']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', saveState);
      el.addEventListener('input', saveState);
    });

  // Performance toggle -> recompute LOD
  const performanceToggle = document.getElementById('performance-toggle');
  performanceToggle?.addEventListener('change', actions.updateLOD);

  // Path rendering buttons
  document.getElementById('render-path-button')?.addEventListener('click', () => {
    const sel = actions.getSelection?.();
    if (sel?.selectionStartNode && sel?.selectionEndNode) {
      calculateAndRenderPath(sel.selectionStartNode, sel.selectionEndNode);
    } else if (sel?.selectionStartNode) {
      calculateAndRenderPath(sel.selectionStartNode);
    }
  });

  document.getElementById('popup-close-button')?.addEventListener('click', () => {
    document.getElementById('popup-viewport')?.classList.add('hidden');
  });

  document.getElementById('popup-copy-button')?.addEventListener('click', () => {
    const sel = actions.getSelection?.();
    let params;
    if (sel?.selectionStartNode && sel?.selectionEndNode) {
      params = new URLSearchParams({ pathStart: sel.selectionStartNode, pathEnd: sel.selectionEndNode });
    } else if (sel?.selectionStartNode) {
      params = new URLSearchParams({ dependenciesFor: sel.selectionStartNode });
    }
    if (!params) return;
    const shareURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareURL).then(() => { alert(`URL copied to clipboard!\n\n${shareURL}`); }, (err) => alert('Failed to copy URL: ' + err));
  });

  // Help overlay
  helpButton?.addEventListener('click', () => helpViewport?.classList.remove('hidden'));
  helpCloseButton?.addEventListener('click', () => helpViewport?.classList.add('hidden'));
  helpViewport?.addEventListener('click', (e) => { if (e.target === helpViewport) helpViewport.classList.add('hidden'); });
  const betaBadge = document.getElementById('beta-badge');
  const openHelp = () => { if (helpViewport) helpViewport.classList.remove('hidden'); };
  betaBadge?.addEventListener('click', openHelp);
  betaBadge?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHelp(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && helpViewport && !helpViewport.classList.contains('hidden')) helpViewport.classList.add('hidden'); });

  // Lazy load button on landing
  const loadTreeButton = document.getElementById('load-tree-button');
  if (loadTreeButton) {
      loadTreeButton.addEventListener('click', () => {
          try {
              setCookie('landing_seen', '1', 365);
          } catch(e) {}
          actions.loadAndRenderTree?.();
      });
  }
}
