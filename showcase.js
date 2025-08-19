const DEFAULT_STATE = {
    species: "all",
    area: "all",
    layout: "force-directed",
    search: "",
    tierStart: "0",
    tierEnd: "11",
    focus: null,
    performanceMode: true
};

// Global SVG and group so LOD can access current transform and selections
let svg = null;
let g = null;

function loadState() {
    const urlParams = new URLSearchParams(window.location.search);
    const stateFromUrl = {
        layout: urlParams.get("layout"),
        species: urlParams.get("species"),
        area: urlParams.get("area"),
        search: urlParams.get("search"),
        tierStart: urlParams.get("tierStart"),
        tierEnd: urlParams.get("tierEnd"),
        focus: urlParams.get("focus")
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
            focus: stateFromUrl.focus || null
        };
    }

    try {
        const raw = localStorage.getItem("techTreeState");
        const parsed = raw ? JSON.parse(raw) : DEFAULT_STATE;
        // Ensure defaults for any new fields
        if (parsed.performanceMode === undefined) parsed.performanceMode = true;
        return parsed;
    } catch (e) {
        console.warn("Could not load saved state:", e);
        return DEFAULT_STATE;
    }
}

function saveState() {
    const state = {
        species: document.getElementById("species-select").value,
        area: document.getElementById("area-select").value,
        layout: document.getElementById("layout-select").value,
        search: document.getElementById("search-input").value,
        tierStart: document.getElementById("start-tier-select").value,
        tierEnd: document.getElementById("end-tier-select").value,
        focus: window.currentFocusId || null,
        performanceMode: !!document.getElementById("performance-toggle")?.checked
    };
    try {
        localStorage.setItem("techTreeState", JSON.stringify(state));
    } catch (e) {
        console.warn("Could not save state:", e);
    }
}

function updateLOD() {
    if (!g || !svg) return;
    const t = d3.zoomTransform(svg.node());
    const k = t.k;
    const width = parseFloat(svg.attr('width')) || svg.node().clientWidth || 0;
    const height = parseFloat(svg.attr('height')) || svg.node().clientHeight || 0;

    // World-space viewport rectangle derived from current transform
    const x0 = (0 - t.x) / k, y0 = (0 - t.y) / k;
    const x1 = (width - t.x) / k, y1 = (height - t.y) / k;
    const margin = 120; // allow a small offscreen margin

    const isVisible = (d) => d && typeof d.x === 'number' && typeof d.y === 'number'
        && d.x >= (x0 - margin) && d.x <= (x1 + margin)
        && d.y >= (y0 - margin) && d.y <= (y1 + margin);

    // Lower thresholds so details appear earlier when zooming in
    const showLabelsAt = 0.45;
    const showTiersAt = 0.60;
    const showLinksAt = 0.30;
    const showCirclesAt = 0.45; 

    // Lazy-create heavy DOM when thresholds are reached
    const flags = {
        labels: g.property('labelsInitialized') || false,
        tiers: g.property('tiersInitialized') || false,
        links: g.property('linksInitialized') || false,
    };
    const layout = g.property('layout');
    const data = g.datum && g.datum() ? g.datum() : { nodes: [], links: [] };
    const nodesSel = g.select('.nodes-layer').selectAll('.tech-node');
    const linksLayer = g.select('.links-layer');

    // Only use LOD when graph is large and Performance mode is ON
    const totalNodes = (data.nodes || []).length;
    const performanceMode = !!document.getElementById('performance-toggle')?.checked;
    const useLOD = performanceMode && totalNodes > 200;

    if (!useLOD) {
        // Eagerly create heavy DOM once if not already present
        if (!flags.labels && !nodesSel.empty()) {
            const nodeHeight = (layout === 'disjoint-force-directed') ? 70 : 80;
            nodesSel.append('text')
                .attr('class', 'node-label')
                .attr('y', -nodeHeight / 2 + 15)
                .attr('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .style('fill', '#ffffff')
                .text(d => d.name ? d.name.substring(0, 18) : d.id);
            nodesSel.append('text')
                .attr('class', 'node-label')
                .attr('y', -nodeHeight / 2 + 30)
                .attr('text-anchor', 'middle')
                .style('fill', '#ffffff')
                .text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
            nodesSel.append('text')
                .attr('class', 'node-label')
                .attr('y', -nodeHeight / 2 + (nodeHeight === 70 ? 45 : 50))
                .attr('text-anchor', 'middle')
                .style('font-size', '8px')
                .style('fill', '#ffffff')
                .text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
            g.property('labelsInitialized', true);
        }

        if (!flags.tiers && !nodesSel.empty()) {
            const nodeWidth = (layout === 'disjoint-force-directed') ? 120 : 140;
            const nodeHeight = (layout === 'disjoint-force-directed') ? 70 : 80;
            const stripeWidth = 8;
            const cornerRadius = (layout === 'disjoint-force-directed') ? 8 : 10;
            const x0t = -nodeWidth / 2;
            const y0t = -nodeHeight / 2;
            const x1t = -nodeWidth / 2 + stripeWidth;
            const x1tAdj = x1t + 1; // move wedge slightly into the node to avoid seam
            const y1t = nodeHeight / 2;
            const rt = cornerRadius;
            const pathDataT = `M ${x0t},${y0t + rt} A ${rt},${rt} 0 0 1 ${x0t + rt},${y0t} L ${x1tAdj},${y0t} L ${x1tAdj},${y1t} L ${x0t + rt},${y1t} A ${rt},${rt} 0 0 1 ${x0t},${y1t - rt} Z`;

            const tierIndicator = nodesSel.append('g').attr('class', 'tier-indicator');
            tierIndicator.append('path').attr('d', pathDataT).attr('fill', 'white');

            tierIndicator.each(function(d) {
                const tier = parseInt(d.tier) || 0;
                if (tier > 0) {
                    const tg = d3.select(this);
                    const clipId = `clip-${d.id.replace(/[^a-zA-Z0-9-_]/g, '_')}`;

                    tg.append('defs')
                      .append('clipPath')
                      .attr('id', clipId)
                      .append('path')
                      .attr('d', pathDataT);

                    const stripes = tg.append('g').attr('clip-path', `url(#${clipId})`);
                    const stripeSpacing = 7;
                    for (let i = 0; i < tier; i++) {
                        const y = y0t + i * stripeSpacing;
                        stripes.append('line')
                            .attr('stroke', 'black')
                            .attr('stroke-width', 3)
                            .attr('x1', x0t - 5)
                            .attr('y1', y)
                            .attr('x2', x1t + 5)
                            .attr('y2', y + (x1t - x0t) + 10);
                    }
                }
            });
            g.property('tiersInitialized', true);
        }

        if (!flags.links && linksLayer.size()) {
            if (layout === 'force-directed' || layout === 'disjoint-force-directed') {
                linksLayer.selectAll('.link')
                    .data(data.links)
                    .join('line')
                    .attr('class', 'link')
                    .attr('stroke', layout === 'force-directed' ? '#e0e0e0ff' : '#999')
                    .attr('stroke-opacity', layout === 'force-directed' ? 0.5 : 0.6);
            } else if (layout === 'force-directed-arrows') {
                linksLayer.selectAll('.link')
                    .data(data.links)
                    .join('polygon')
                    .attr('class', 'link')
                    .attr('fill', '#e0e0e0ff')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 1)
                    .attr('stroke-opacity', 0.7);
            }
            g.property('linksInitialized', true);
        }

        // Show everything for small graphs
        g.selectAll('.node-label').style('display', null);
        g.selectAll('.tier-indicator').style('display', null);
        g.selectAll('.link').style('display', null);
        return;
    }

    // Initialize labels once when zoom passes threshold
    if (!flags.labels && k >= showLabelsAt && !nodesSel.empty()) {
        const nodeHeight = (layout === 'disjoint-force-directed') ? 70 : 80;
        nodesSel.append('text')
            .attr('class', 'node-label')
            .attr('y', -nodeHeight / 2 + 15)
            .attr('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .style('fill', '#ffffff')
            .text(d => d.name ? d.name.substring(0, 18) : d.id);
        nodesSel.append('text')
            .attr('class', 'node-label')
            .attr('y', -nodeHeight / 2 + 30)
            .attr('text-anchor', 'middle')
            .style('fill', '#ffffff')
            .text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        nodesSel.append('text')
            .attr('class', 'node-label')
            .attr('y', -nodeHeight / 2 + (nodeHeight === 70 ? 55 : 60))
            .attr('text-anchor', 'middle')
            .style('font-size', '8px')
            .style('fill', '#ffffff')
            .text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
        g.property('labelsInitialized', true);
    }

    // Initialize tier indicators once when zoom passes threshold
    if (!flags.tiers && k >= showTiersAt && !nodesSel.empty()) {
        const nodeWidth = (layout === 'disjoint-force-directed') ? 120 : 140;
        const nodeHeight = (layout === 'disjoint-force-directed') ? 70 : 80;
        const stripeWidth = 8;
        const cornerRadius = (layout === 'disjoint-force-directed') ? 8 : 10;
        const x0 = -nodeWidth / 2;
        const y0 = -nodeHeight / 2;
        const x1 = -nodeWidth / 2 + stripeWidth;
        const x1Adj = x1 + 1; // move wedge slightly into the node to avoid seam
        const y1 = nodeHeight / 2;
        const r = cornerRadius;
        const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1Adj},${y0} L ${x1Adj},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;

        const tierIndicator = nodesSel.append('g').attr('class', 'tier-indicator');
        tierIndicator.append('path').attr('d', pathData).attr('fill', 'white');

        tierIndicator.each(function(d) {
            const tier = parseInt(d.tier) || 0;
            if (tier > 0) {
                const tg = d3.select(this);
                const clipId = `clip-${d.id.replace(/[^a-zA-Z0-9-_]/g, '_')}`;

                tg.append('defs')
                  .append('clipPath')
                  .attr('id', clipId)
                  .append('path')
                  .attr('d', pathData);

                const stripes = tg.append('g').attr('clip-path', `url(#${clipId})`);
                const stripeSpacing = 7;
                for (let i = 0; i < tier; i++) {
                    const y = y0 + i * stripeSpacing;
                    stripes.append('line')
                        .attr('stroke', 'black')
                        .attr('stroke-width', 3)
                        .attr('x1', x0 - 5)
                        .attr('y1', y)
                        .attr('x2', x1 + 5)
                        .attr('y2', y + (x1 - x0) + 10);
                }
            }
        });
        g.property('tiersInitialized', true);
    }

    // Initialize links once when zoom passes threshold
    if (!flags.links && k >= showLinksAt && linksLayer.size()) {
        if (layout === 'force-directed' || layout === 'disjoint-force-directed') {
            linksLayer.selectAll('.link')
                .data(data.links)
                .join('line')
                .attr('class', 'link')
                .attr('stroke', layout === 'force-directed' ? '#e0e0e0ff' : '#999')
                .attr('stroke-opacity', layout === 'force-directed' ? 0.5 : 0.6);
        } else if (layout === 'force-directed-arrows') {
            linksLayer.selectAll('.link')
                .data(data.links)
                .join('polygon')
                .attr('class', 'link')
                .attr('fill', '#e0e0e0ff')
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('stroke-opacity', 0.7);
        }
        g.property('linksInitialized', true);
    }

    // LOD logic
    const isCircleView = useLOD && k < showCirclesAt;

    g.selectAll('.node-circle').style('display', d => (isCircleView && isVisible(d)) ? null : 'none');
    g.selectAll('.node-rect, .tier-indicator, .node-label').style('display', d => (isCircleView) ? 'none' : null);


    if (!isCircleView) {
        g.selectAll('.node-label').style('display', d => (k >= showLabelsAt && isVisible(d)) ? null : 'none');
        g.selectAll('.tier-indicator').style('display', d => (k >= showTiersAt && isVisible(d)) ? null : 'none');
    }

    g.selectAll('.link').style('display', d => {
        // d.source/d.target may be ids before simulation init; guard for objects
        const s = d && (d.source && d.source.x !== undefined ? d.source : null);
        const tt = d && (d.target && d.target.x !== undefined ? d.target : null);
        const endpointsVisible = isVisible(s) || isVisible(tt);
        return (k >= showLinksAt && endpointsVisible) ? null : 'none';
    });
}

function applyState(state) {
    document.getElementById("species-select").value = state.species;
    document.getElementById("area-select").value = state.area;
    document.getElementById("layout-select").value = state.layout;
    document.getElementById("search-input").value = state.search;
    document.getElementById("start-tier-select").value = state.tierStart;
    document.getElementById("end-tier-select").value = state.tierEnd;
    const perf = document.getElementById("performance-toggle");
    if (perf) perf.checked = state.performanceMode ?? true;
}

function resetState() {
    localStorage.removeItem("techTreeState");
    window.location.search = ''; // Clear URL params and reload
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const speciesSelect = document.getElementById('species-select');
    const speciesExclusiveToggle = document.getElementById('species-exclusive-toggle');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchBackButton = document.getElementById('search-back-button');
    const searchScopeToggle = document.getElementById('search-scope-toggle');
    const techTreeContainer = document.getElementById('tech-tree');
    const tooltip = document.getElementById('tooltip');
    const areaSelect = document.getElementById('area-select');
    const resetButton = document.getElementById('reset-button');
    const showTierButton = document.getElementById('show-tier-button');
    const techCounter = document.getElementById('tech-counter');
    const layoutSelect = document.getElementById('layout-select');
    const copyBtn = document.getElementById("share-button");
    const landingCard = document.getElementById('landing-card');
    const showTreeButton = document.getElementById('show-tree-button');
    const treeToolbar = document.getElementById('tree-toolbar');
    const viewLegend = document.getElementById('view-legend');
    const backButton = document.getElementById('back-button');
    const forwardButton = document.getElementById('forward-button');
    const generalTab = document.getElementById('general-tab');
    const detailsTab = document.getElementById('details-tab');
    const generalPanel = document.getElementById('general-panel');
    const detailsPanel = document.getElementById('details-panel');
    const techDetailsContent = document.getElementById('tech-details-content');
    const sidebar = document.getElementById('sidebar');
    const helpButton = document.getElementById('help-button');
    const helpViewport = document.getElementById('help-viewport');
    const helpCloseButton = document.getElementById('help-close-button');

    // --- State Variables ---
    let selectionStartNode = null;
    let selectionEndNode = null;
    let navigationHistory = [];
    let historyIndex = -1;
    let isTreeInitialized = false;
    let isDataLoaded = false;
    let allTechs = [];
    let allSpecies = new Set();
    let nodes = [];
    let links = [];
    let preSearchState = null;
    let simulation;
    let activeTechId = null;
    let tierFilterActive = false;

    // --- Core Initialization Functions ---
    function prepareUI() {
        if (isTreeInitialized) return;
        isTreeInitialized = true;

        // Hide landing card and show the tree view
        landingCard.classList.add('hidden');
        treeToolbar.style.display = 'flex';
        techTreeContainer.classList.remove('hidden');
        viewLegend.classList.remove('hidden');

        // Set up permanent event listeners now that the tree is active
        setupEventListeners();
    }

    function loadSpeciesFilter() {
        fetch('assets/species.json')
            .then(response => response.json())
            .then(speciesList => {
                speciesList.forEach(species => {
                    const option = document.createElement('option');
                    option.value = species;
                    option.textContent = species;
                    speciesSelect.appendChild(option);
                });
                // Re-apply state in case the species list was loaded after the initial state was applied
                const initialState = loadState();
                applyState(initialState);
            }).catch(error => console.error('Error loading species list:', error));
    }

    function loadAndRenderTree() {
        // Ensure the UI is prepared so the container has a size
        prepareUI();
        if (isDataLoaded) {
            // If data is already loaded, just re-render with current filters
            const currentState = loadState();
            applyState(currentState);
            tierFilterActive = false; // Do not activate tier filter by default
            updateVisualization(currentState.species, currentState.focus, false);
            return;
        }
        
        // Fetch data and render the tree for the first time
        fetch('assets/technology.json')
            .then(response => response.json())
            .then(data => {
                isDataLoaded = true;
                allTechs = data;
                // Species list is now loaded separately at startup

                const initialState = loadState();
                applyState(initialState);
                // Validate initial focus exists in dataset
                const initialFocusValid = initialState.focus && data.some(t => t.id === initialState.focus);
                window.currentFocusId = initialFocusValid ? initialState.focus : null;
                activeTechId = window.currentFocusId;

                if (activeTechId) {
                    navigationHistory = [activeTechId];
                    historyIndex = 0;
                }

                tierFilterActive = false; // Do not activate tier filter by default
                updateVisualization(initialState.species, activeTechId, false);
            });
    }

    // --- Event Listener Setup ---
    function setupEventListeners() {
        generalTab.addEventListener('click', () => switchTab('general'));
        detailsTab.addEventListener('click', () => switchTab('details'));

        if (copyBtn) {
            copyBtn.addEventListener("click", () => {
                const focus = window.currentFocusId;
                const params = new URLSearchParams({
                    layout: document.getElementById("layout-select").value,
                    species: document.getElementById("species-select").value,
                    area: document.getElementById("area-select").value,
                    tierStart: document.getElementById("start-tier-select").value,
                    tierEnd: document.getElementById("end-tier-select").value
                });
                if (focus) {
                    params.set("focus", focus);
                } else {
                    const search = document.getElementById("search-input").value;
                    if (search && search.trim() !== "") params.set("search", search);
                }
                const shareURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                navigator.clipboard.writeText(shareURL).then(() => {
                    alert(`Link ${focus ? "to this Branch" : ""} copied to clipboard!\n\n${shareURL}`);
                }, (err) => alert("Copy URL failed: " + err));
            });
        }

        speciesSelect.addEventListener('change', (event) => updateVisualization(event.target.value, activeTechId));
        speciesExclusiveToggle.addEventListener('change', () => updateVisualization(speciesSelect.value, activeTechId));
        areaSelect.addEventListener('change', () => updateVisualization(speciesSelect.value, activeTechId));
        layoutSelect.addEventListener('change', () => updateVisualization(speciesSelect.value, activeTechId));
        searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') searchTech(); });
        searchButton.addEventListener('click', searchTech);
        searchBackButton.addEventListener('click', () => {
            if (preSearchState) {
                // Preserve glossary inside #tech-tree; only remove previous SVGs
                techTreeContainer.querySelectorAll('svg').forEach(el => el.remove());
                const selectedLayout = document.getElementById('layout-select').value;
                if (selectedLayout === 'force-directed') {
                    renderForceDirectedGraph(preSearchState.nodes, preSearchState.links, speciesSelect.value);
                } else if (selectedLayout === 'disjoint-force-directed') {
                    renderDisjointForceDirectedGraph(preSearchState.nodes, preSearchState.links, speciesSelect.value);
                } else if (selectedLayout === 'force-directed-arrows') {
                    renderForceDirectedArrowsGraph(preSearchState.nodes, preSearchState.links, speciesSelect.value);
                }
                nodes = preSearchState.nodes;
                links = preSearchState.links;
                preSearchState = null;
                searchBackButton.style.display = 'none';
            }
        });
        resetButton.addEventListener('click', resetState);

        backButton.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                updateVisualization(speciesSelect.value, navigationHistory[historyIndex], false);
            }
        });

        forwardButton.addEventListener('click', () => {
            if (historyIndex < navigationHistory.length - 1) {
                historyIndex++;
                updateVisualization(speciesSelect.value, navigationHistory[historyIndex], false);
            }
        });

        showTierButton.addEventListener('click', () => {
            const { startTier, endTier } = getSelectedTierRange();
            if (startTier > endTier) {
                alert('Start Tier cannot be higher than End Tier');
                return;
            }
            tierFilterActive = true;
            updateVisualization(speciesSelect.value, activeTechId);
        });

        ["species-select", "area-select", "layout-select", "search-input", "start-tier-select", "end-tier-select", "performance-toggle"].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener("change", saveState);
                element.addEventListener("input", saveState);
            }
        });

        const performanceToggle = document.getElementById('performance-toggle');
        if (performanceToggle) {
            performanceToggle.addEventListener('change', () => {
                // Recompute LOD visibility immediately on toggle
                updateLOD();
            });
        }

        document.getElementById('render-path-button').addEventListener('click', () => {
            if (selectionStartNode && selectionEndNode) {
                calculateAndRenderPath(selectionStartNode, selectionEndNode);
            } else if (selectionStartNode) {
                calculateAndRenderPath(selectionStartNode);
            }
        });

        document.getElementById('popup-close-button').addEventListener('click', () => {
            document.getElementById('popup-viewport').classList.add('hidden');
        });

        document.getElementById('popup-copy-button').addEventListener('click', () => {
            let params;
            if (selectionStartNode && selectionEndNode) {
                params = new URLSearchParams({
                    pathStart: selectionStartNode,
                    pathEnd: selectionEndNode
                });
            } else if (selectionStartNode) {
                params = new URLSearchParams({
                    dependenciesFor: selectionStartNode
                });
            }
            const shareURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
            navigator.clipboard.writeText(shareURL).then(() => {
                alert(`URL copied to clipboard!\n\n${shareURL}`);
            }, (err) => alert("Failed to copy URL: " + err));
        });

        // Help overlay handlers
        if (helpButton && helpViewport) {
            helpButton.addEventListener('click', () => {
                helpViewport.classList.remove('hidden');
            });
        }
        if (helpCloseButton && helpViewport) {
            helpCloseButton.addEventListener('click', () => {
                helpViewport.classList.add('hidden');
            });
        }
        if (helpViewport) {
            // Close when clicking the dimmed backdrop
            helpViewport.addEventListener('click', (e) => {
                if (e.target === helpViewport) helpViewport.classList.add('hidden');
            });
        }
        // Close help on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpViewport && !helpViewport.classList.contains('hidden')) {
                helpViewport.classList.add('hidden');
            }
        });

        // This is for the new button you will add in the HTML
        const loadTreeButton = document.getElementById('load-tree-button');
        if (loadTreeButton) {
            loadTreeButton.addEventListener('click', loadAndRenderTree);
        }
    }

    // --- Visualization and Helper Functions ---

    function handleNodeSelection(d) {
        const renderPathButton = document.getElementById('render-path-button');

        if (!selectionStartNode) {
            selectionStartNode = d.id;
            selectionEndNode = null;
        } else if (!selectionEndNode) {
            selectionEndNode = d.id;
        } else {
            selectionStartNode = d.id;
            selectionEndNode = null;
        }

        // Update visual indicators for all nodes
        g.selectAll('.tech-node rect').attr('stroke', nodeData => {
            if (nodeData.id === selectionStartNode) return 'lime';
            if (nodeData.id === selectionEndNode) return 'red';
            if (nodeData.id === activeTechId) return 'yellow';
            return 'none';
        });

        if (selectionStartNode) {
            renderPathButton.style.display = 'inline-block';
            if (selectionEndNode) {
                renderPathButton.textContent = 'Show Research Path';
            } else {
                renderPathButton.textContent = 'Show Required Research';
            }
        } else {
            renderPathButton.style.display = 'none';
        }
    }

    function formatTooltip(d) {
        let info = '';
        const excludeKeys = new Set(['x', 'y', 'vx', 'vy', 'index', 'fx', 'fy']);
        for (const key in d) {
            if (d.hasOwnProperty(key) && d[key] && !excludeKeys.has(key)) {
                info += `<strong>${key}:</strong> ${Array.isArray(d[key]) ? d[key].join(', ') : d[key]}<br>`;
            }
        }
        return info;
    }

    function switchTab(tab) {
        if (tab === 'details') {
            generalTab.classList.remove('active');
            detailsTab.classList.add('active');
            generalPanel.classList.add('hidden');
            detailsPanel.classList.add('active');
        } else {
            detailsTab.classList.remove('active');
            generalTab.classList.add('active');
            detailsPanel.classList.remove('active');
            generalPanel.classList.remove('hidden');
        }
    }

    function getConnectedTechIds(startId, techs) {
        const connected = new Set();
        function findAncestors(id) {
            const node = techs.find(t => t.id === id);
            if (node && node.prerequisites) {
                node.prerequisites.forEach(prereq => {
                    if (!connected.has(prereq)) {
                        connected.add(prereq);
                        findAncestors(prereq);
                    }
                });
            }
        }
        function findDescendants(id) {
            techs.forEach(t => {
                if (t.prerequisites && t.prerequisites.includes(id) && !connected.has(t.id)) {
                    connected.add(t.id);
                    findDescendants(t.id);
                }
            });
        }
        connected.add(startId);
        findAncestors(startId);
        findDescendants(startId);
        return connected;
    }

    function getSelectedTierRange() {
        const rawStart = document.getElementById('start-tier-select')?.value;
        const rawEnd = document.getElementById('end-tier-select')?.value;
        let startTier = parseInt(rawStart, 10);
        let endTier = parseInt(rawEnd, 10);
        if (isNaN(startTier)) startTier = 0;
        if (isNaN(endTier)) endTier = 99;
        return { startTier, endTier };
    }

    function updateHistoryButtons() {
        backButton.style.display = navigationHistory.length > 1 ? 'inline-block' : 'none';
        forwardButton.style.display = navigationHistory.length > 1 ? 'inline-block' : 'none';
        backButton.disabled = historyIndex <= 0;
        forwardButton.disabled = historyIndex >= navigationHistory.length - 1;
    }

    function filterTechsByTier(techs) {
        const { startTier, endTier } = getSelectedTierRange();
        return techs.filter(t => {
            const tier = parseInt(t.tier) || 0;
            return tier >= startTier && tier <= endTier;
        });
    }

    window.updateVisualization = function(selectedSpecies, highlightId = null, addToHistory = true) {
        // Ensure UI is visible and data is available before attempting to render
        if (techTreeContainer.classList.contains('hidden')) {
            prepareUI();
        }
        if (!isDataLoaded) {
            loadAndRenderTree();
            return;
        }
        if (addToHistory && highlightId && highlightId !== activeTechId) {
            if (historyIndex < navigationHistory.length - 1) {
                navigationHistory = navigationHistory.slice(0, historyIndex + 1);
            }
            navigationHistory.push(highlightId);
            historyIndex = navigationHistory.length - 1;
        }

        activeTechId = highlightId;
        const selectedArea = areaSelect.value;
        const selectedLayout = layoutSelect.value;

        if (activeTechId) {
            const tech = allTechs.find(t => t.id === activeTechId);
            if (tech) {
                techDetailsContent.innerHTML = formatTooltip(tech);
                switchTab('details');
            }
        }

        const isExclusive = speciesExclusiveToggle.checked;

        let baseTechs = allTechs.filter(tech => {
            const areaMatch = selectedArea === 'all' || tech.area === selectedArea;
            
            let speciesMatch;
            if (selectedSpecies === 'all') {
                speciesMatch = true;
            } else if (isExclusive) {
                // Corrected logic: Show if the species is in the list, and the list is not empty (i.e., not global)
                speciesMatch = tech.required_species && tech.required_species.includes(selectedSpecies);
            } else {
                // Original logic for non-exclusive: show global techs and techs for the selected species
                speciesMatch = !tech.required_species || tech.required_species.length === 0 || tech.required_species.includes(selectedSpecies);
            }
            
            return areaMatch && speciesMatch;
        });

        let filteredTechs;
        if (activeTechId) {
            const connectedIds = getConnectedTechIds(activeTechId, allTechs);
            filteredTechs = baseTechs.filter(t => connectedIds.has(t.id));
            // If no nodes found (e.g., stale focus), clear focus and fall back
            if (filteredTechs.length === 0) {
                activeTechId = null;
                window.currentFocusId = null;
                filteredTechs = baseTechs;
            }
        } else {
            filteredTechs = baseTechs;
        }

        // Preserve pre-tier-filter set for fallback if tier filter eliminates all nodes
        const preTierFiltered = filteredTechs;
        if (tierFilterActive) {
            filteredTechs = filterTechsByTier(filteredTechs);
            if (filteredTechs.length === 0) {
                // Fallback: render without tier filter to avoid empty view
                filteredTechs = preTierFiltered;
            }
        }

        updateHistoryButtons();
        techCounter.textContent = `Displayed Technologies: ${filteredTechs.length}`;
        // Preserve glossary inside #tech-tree; only remove previous SVGs
        techTreeContainer.querySelectorAll('svg').forEach(el => el.remove());
        nodes = filteredTechs.map(tech => ({ ...tech }));
        
        links = [];
        const nodeIds = new Set(nodes.map(n => n.id));
        nodes.forEach(tech => {
            if (tech.prerequisites) {
                tech.prerequisites.forEach(prereq => {
                    if (nodeIds.has(prereq)) {
                        links.push({ source: prereq, target: tech.id });
                    }
                });
            }
        });

        if (selectedLayout === 'force-directed') renderForceDirectedGraph(nodes, links, selectedSpecies);
        else if (selectedLayout === 'disjoint-force-directed') renderDisjointForceDirectedGraph(nodes, links, selectedSpecies);
        else if (selectedLayout === 'force-directed-arrows') renderForceDirectedArrowsGraph(nodes, links, selectedSpecies);
    }

    function renderForceDirectedArrowsGraph(nodes, links, selectedSpecies, container = techTreeContainer) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const zoom = d3.zoom().on("zoom", (event) => { g.attr("transform", event.transform); updateLOD(); });
        svg = d3.select(container).append('svg').attr('width', width).attr('height', height).call(zoom);

        const defs = svg.append('defs');
        const gradients = {
            'society': ['#3a3a3a', getAreaColor('society')],
            'engineering': ['#3a3a3a', getAreaColor('engineering')],
            'physics': ['#3a3a3a', getAreaColor('physics')]
        };

        for (const [area, colors] of Object.entries(gradients)) {
            const gradient = defs.append('linearGradient')
                .attr('id', `gradient-${area}`)
                .attr('x1', '0%').attr('y1', '0%')
                .attr('x2', '100%').attr('y2', '0%');
            gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[0]);
            gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[1]);
        }
        
        g = svg.append("g");
        // layers and flags for lazy creation
        g.append('g').attr('class','links-layer');
        g.append('g').attr('class','nodes-layer');
        g.property('labelsInitialized', false)
         .property('tiersInitialized', false)
         .property('linksInitialized', false)
         .property('layout','force-directed-arrows')
         .datum({nodes, links});

        const initialScale = Math.max(0.4, Math.min(1.2, 40 / Math.max(1, nodes.length)));
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(initialScale).translate(-width/2, -height/2);
        svg.call(zoom.transform, initialTransform);


        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-250))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(80));
        for (let i = 0; i < 50; ++i) simulation.tick();
        
        const link = g.select('.links-layer').selectAll('polygon')
            .data(links)
            .join('polygon')
            .attr('class', 'link')
            .attr('fill', '#e0e0e0ff')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.7);

        const node = g.select('.nodes-layer').selectAll('g').data(nodes).join('g').attr('class', 'tech-node').call(drag(simulation))
            .on('mouseover', (event, d) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', (event) => {
                const treeRect = techTreeContainer.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let x = event.clientX + 15;
                let y = event.clientY + 15;

                if (x + tooltipRect.width > treeRect.right) {
                    x = event.clientX - tooltipRect.width - 15;
                }
                if (y + tooltipRect.height > treeRect.bottom) {
                    y = event.clientY - tooltipRect.height - 15;
                }

                tooltip.style.left = `${Math.max(treeRect.left, x)}px`;
                tooltip.style.top = `${Math.max(treeRect.top, y)}px`;
            })
            .on('mouseout', () => tooltip.style.display = 'none')
            .on('click', (event, d) => {
                window.currentFocusId = d.id;
                updateVisualization(selectedSpecies, d.id, true);
            })
            .on('contextmenu', (event, d) => {
                event.preventDefault();
                handleNodeSelection(d);
            });
        const nodeWidth = 140, nodeHeight = 80;
        node.append('circle')
            .attr('class', 'node-circle')
            .attr('r', 30)
            .attr('fill', d => getAreaColor(d.area))
            .style('display', 'none');

        node.append('rect').attr('class', 'node-rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 10).attr('ry', 10)
            .attr('fill', d => (d.area === 'society' || d.area === 'engineering' || d.area === 'physics') ? `url(#gradient-${d.area})` : getAreaColor(d.area))
            .attr('stroke', d => {
                if (d.id === activeTechId) return 'yellow';
                if (d.id === selectionStartNode) return 'lime';
                if (d.id === selectionEndNode) return 'red';
                return 'none';
            })
            .attr('stroke-width', d => (d.id === activeTechId || d.id === selectionStartNode || d.id === selectionEndNode) ? 3 : 1);
        
        const stripeWidth = 8;
        const cornerRadius = 10;
        const x0 = -nodeWidth / 2;
        const y0 = -nodeHeight / 2;
        const x1 = -nodeWidth / 2 + stripeWidth;
        const y1 = nodeHeight / 2;
        const r = cornerRadius;
        const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;
        
        // labels and tier indicators are lazily created in updateLOD()
        
        let tickCountArrows = 0;
        simulation.on('tick', () => {
            // Update any existing links (created lazily)
            g.select('.links-layer').selectAll('.link').attr('points', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length === 0) return `${d.source.x},${d.source.y} ${d.source.x},${d.source.y} ${d.source.x},${d.source.y}`;

                const nx = dx / length;
                const ny = dy / length;
                const px = -ny;
                const py = nx;
                const baseWidth = 10;

                const halfWidth = nodeWidth / 2;
                const halfHeight = nodeHeight / 2;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);

                let tipX, tipY;
                if (absDx / halfWidth > absDy / halfHeight) {
                    const sign = Math.sign(dx);
                    tipX = d.target.x - sign * halfWidth;
                    tipY = d.target.y - sign * halfWidth * dy / dx;
                } else {
                    const sign = Math.sign(dy);
                    tipY = d.target.y - sign * halfHeight;
                    tipX = d.target.x - sign * halfHeight * dx / dy;
                }

                const base1X = d.source.x + px * baseWidth / 2;
                const base1Y = d.source.y + py * baseWidth / 2;
                const base2X = d.source.x - px * baseWidth / 2;
                const base2Y = d.source.y - py * baseWidth / 2;

                return `${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`;
            });
            node.attr('transform', d => `translate(${d.x},${d.y})`);
            // Periodically refresh LOD so moving nodes update visibility without zoom
            if (++tickCountArrows % 5 === 0) updateLOD();
            if (++tickCountArrows > 60 && simulation.alpha() < 0.03) {
                simulation.stop();
                updateLOD();
            }
        });

        // Apply initial LOD after setting initial transform
        updateLOD();
    }

    function renderForceDirectedGraph(nodes, links, selectedSpecies, container = techTreeContainer) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const zoom = d3.zoom().on("zoom", (event) => { g.attr("transform", event.transform); updateLOD(); });
        svg = d3.select(container).append('svg').attr('width', width).attr('height', height).call(zoom);

        const defs = svg.append('defs');
        const gradients = {
            'society': ['#3a3a3a', getAreaColor('society')],
            'engineering': ['#3a3a3a', getAreaColor('engineering')],
            'physics': ['#3a3a3a', getAreaColor('physics')]
        };

        for (const [area, colors] of Object.entries(gradients)) {
            const gradient = defs.append('linearGradient')
                .attr('id', `gradient-${area}`)
                .attr('x1', '0%').attr('y1', '0%')
                .attr('x2', '100%').attr('y2', '0%');
            gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[0]);
            gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[1]);
        }
        
        g = svg.append("g");
        // layers and flags for lazy creation
        g.append('g').attr('class','links-layer');
        g.append('g').attr('class','nodes-layer');
        g.property('labelsInitialized', false)
         .property('tiersInitialized', false)
         .property('linksInitialized', false)
         .property('layout','force-directed')
         .datum({nodes, links});

        const initialScale = Math.max(0.4, Math.min(1.2, 40 / Math.max(1, nodes.length)));
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(initialScale).translate(-width/2, -height/2);
        svg.call(zoom.transform, initialTransform);


        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-250))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(80));
        for (let i = 0; i < 50; ++i) simulation.tick();
        const node = g.select('.nodes-layer').selectAll('g').data(nodes).join('g').attr('class', 'tech-node').call(drag(simulation))
            .on('mouseover', (event, d) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', (event) => {
                const treeRect = techTreeContainer.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let x = event.clientX + 15;
                let y = event.clientY + 15;

                if (x + tooltipRect.width > treeRect.right) {
                    x = event.clientX - tooltipRect.width - 15;
                }
                if (y + tooltipRect.height > treeRect.bottom) {
                    y = event.clientY - tooltipRect.height - 15;
                }

                tooltip.style.left = `${Math.max(treeRect.left, x)}px`;
                tooltip.style.top = `${Math.max(treeRect.top, y)}px`;
            })
            .on('mouseout', () => tooltip.style.display = 'none')
            .on('click', (event, d) => {
                window.currentFocusId = d.id;
                updateVisualization(selectedSpecies, d.id, true);
            })
            .on('contextmenu', (event, d) => {
                event.preventDefault();
                handleNodeSelection(d);
            });
        const nodeWidth = 140, nodeHeight = 80;
        node.append('circle')
            .attr('class', 'node-circle')
            .attr('r', 30)
            .attr('fill', d => getAreaColor(d.area))
            .style('display', 'none');

        node.append('rect').attr('class', 'node-rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 10).attr('ry', 10)
            .attr('fill', d => d.area ? `url(#gradient-${d.area})` : getAreaColor(d.area))
            .attr('stroke', d => {
                if (d.id === activeTechId) return 'yellow';
                if (d.id === selectionStartNode) return 'lime';
                if (d.id === selectionEndNode) return 'red';
                return 'none';
            })
            .attr('stroke-width', d => (d.id === activeTechId || d.id === selectionStartNode || d.id === selectionEndNode) ? 3 : 1);
        
        const stripeWidth = 8;
        const cornerRadius = 10;
        const x0 = -nodeWidth / 2;
        const y0 = -nodeHeight / 2;
        const x1 = -nodeWidth / 2 + stripeWidth;
        const y1 = nodeHeight / 2;
        const r = cornerRadius;
        const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;
        
        const tierIndicator = node.append('g').attr('class', 'tier-indicator');
        tierIndicator.append('path')
            .attr('d', pathData)
            .attr('fill', 'white');

        tierIndicator.each(function(d) {
            const tier = parseInt(d.tier) || 0;
            if (tier > 0) {
                const g = d3.select(this);
                const clipId = `clip-${d.id.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
                
                g.append('defs')
                 .append('clipPath')
                 .attr('id', clipId)
                 .append('path')
                 .attr('d', pathData);

                const stripes = g.append('g').attr('clip-path', `url(#${clipId})`);
                const stripeSpacing = 7;
                for (let i = 0; i < tier; i++) {
                    const y = y0 + i * stripeSpacing;
                    stripes.append('line')
                        .attr('stroke', 'black')
                        .attr('stroke-width', 3)
                        .attr('x1', x0 - 5)
                        .attr('y1', y)
                        .attr('x2', x1 + 5)
                        .attr('y2', y + (x1 - x0) + 10);
                }
            }
        });
        let tickCount = 0;
        simulation.on('tick', () => {
            // Update any existing links (created lazily)
            g.select('.links-layer').selectAll('.link')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
            // Periodically refresh LOD so moving nodes update visibility without zoom
            if (++tickCount % 5 === 0) updateLOD();
            if (tickCount > 60 && simulation.alpha() < 0.03) {
                simulation.stop();
                updateLOD();
            }
        });

        // Apply initial LOD after setting initial transform
        updateLOD();
    }
    
    function renderDisjointForceDirectedGraph(nodes, links, selectedSpecies, container = techTreeContainer) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const zoom = d3.zoom().on("zoom", (event) => { g.attr("transform", event.transform); updateLOD(); });
        svg = d3.select(container).append('svg').attr('width', width).attr('height', height).call(zoom);
        
        const defs = svg.append('defs');
        const gradients = {
            'society': ['#3a3a3a', getAreaColor('society')],
            'engineering': ['#3a3a3a', getAreaColor('engineering')],
            'physics': ['#3a3a3a', getAreaColor('physics')]
        };

        for (const [area, colors] of Object.entries(gradients)) {
            const gradient = defs.append('linearGradient')
                .attr('id', `gradient-${area}`)
                .attr('x1', '0%').attr('y1', '0%')
                .attr('x2', '100%').attr('y2', '0%');
            gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[0]);
            gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[1]);
        }

        g = svg.append("g");
        // layers and flags for lazy creation
        g.append('g').attr('class','links-layer');
        g.append('g').attr('class','nodes-layer');
        g.property('labelsInitialized', false)
         .property('tiersInitialized', false)
         .property('linksInitialized', false)
         .property('layout','disjoint-force-directed')
         .datum({nodes, links});

        const initialScale = Math.min(1.2, 40 / Math.max(1, nodes.length));
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(initialScale).translate(-width/2, -height/2);
        svg.call(zoom.transform, initialTransform);

        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('x', d3.forceX(width / 2).strength(0.1))
            .force('y', d3.forceY(height / 2).strength(0.1))
            .force('collision', d3.forceCollide().radius(60));

        // Avoid blocking the UI at startup: skip or greatly reduce synchronous pre-ticks
        const perfToggle = document.getElementById('performance-toggle');
        const perfOn = !!perfToggle?.checked;
        const preTicks = perfOn ? 0 : 40; // no blocking when performance mode is on
        for (let i = 0; i < preTicks; ++i) simulation.tick();

        const node = g.select('.nodes-layer').selectAll('g').data(nodes).join('g').attr('class', 'tech-node').call(drag(simulation))
            .on('mouseover', (event, d) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', (event) => {
                const treeRect = techTreeContainer.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let x = event.clientX + 15;
                let y = event.clientY + 15;

                if (x + tooltipRect.width > treeRect.right) {
                    x = event.clientX - tooltipRect.width - 15;
                }
                if (y + tooltipRect.height > treeRect.bottom) {
                    y = event.clientY - tooltipRect.height - 15;
                }

                tooltip.style.left = `${Math.max(treeRect.left, x)}px`;
                tooltip.style.top = `${Math.max(treeRect.top, y)}px`;
            })
            .on('mouseout', () => tooltip.style.display = 'none')
            .on('click', (event, d) => {
                window.currentFocusId = d.id;
                updateVisualization(selectedSpecies, d.id, true);
            })
            .on('contextmenu', (event, d) => {
                event.preventDefault();
                handleNodeSelection(d);
            });

        const nodeWidth = 120, nodeHeight = 70;
        node.append('circle')
            .attr('class', 'node-circle')
            .attr('r', 30)
            .attr('fill', d => getAreaColor(d.area))
            .style('display', 'none');

        node.append('rect').attr('class', 'node-rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 8).attr('ry', 8)
            .attr('fill', d => d.area ? `url(#gradient-${d.area})` : getAreaColor(d.area))
            .attr('stroke', d => {
                if (d.id === activeTechId) return 'yellow';
                if (d.id === selectionStartNode) return 'lime';
                if (d.id === selectionEndNode) return 'red';
                return 'none';
            })
            .attr('stroke-width', d => (d.id === activeTechId || d.id === selectionStartNode || d.id === selectionEndNode) ? 3 : 1);

        // Tier indicators and labels are created by updateLOD() (eagerly for small graphs).

        let tickCountDisjoint = 0;
        simulation.on('tick', () => {
            // Update any existing links (created lazily)
            g.select('.links-layer').selectAll('.link')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
            // Periodically refresh LOD so moving nodes update visibility without zoom
            if (++tickCountDisjoint % 5 === 0) updateLOD();
            if (tickCountDisjoint > 80 && simulation.alpha() < 0.03) {
                simulation.stop();
                updateLOD();
            }
        });

        // Apply initial LOD after setting initial transform
        updateLOD();
    }

    function getPrerequisites(startId) {
        const prerequisites = new Set();
        const techMap = new Map(allTechs.map(t => [t.id, t]));

        function findAncestors(id) {
            if (prerequisites.has(id)) return;
            prerequisites.add(id);
            const node = techMap.get(id);
            if (node && node.prerequisites) {
                node.prerequisites.forEach(prereq => {
                    findAncestors(prereq);
                });
            }
        }

        findAncestors(startId);
        return prerequisites;
    }

    function renderPopupGraph(nodes, links) {
        const container = document.getElementById('popup-tech-tree');
        const width = container.clientWidth;
        const height = container.clientHeight;

        const popupSvg = d3.select(container).append('svg').attr('width', width).attr('height', height);
        const popupG = popupSvg.append("g");
        const zoom = d3.zoom().on("zoom", (event) => popupG.attr("transform", event.transform));
        popupSvg.call(zoom);

        const popupSimulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-250))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(80));

        const link = popupG.append('g').attr('stroke', '#e0e0e0ff').attr('stroke-opacity', 0.5).selectAll('line').data(links).join('line');
        const node = popupG.append('g').selectAll('g').data(nodes).join('g').attr('class', 'tech-node').call(drag(popupSimulation))
            .on('mouseover', (event, d) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = formatTooltip(d);
                tooltip.style.zIndex = 1000; // Bring to front
            })
            .on('mousemove', (event) => {
                const treeRect = techTreeContainer.getBoundingClientRect(); // Use main container for bounds
                const tooltipRect = tooltip.getBoundingClientRect();
                let x = event.clientX + 15;
                let y = event.clientY + 15;

                if (x + tooltipRect.width > treeRect.right) {
                    x = event.clientX - tooltipRect.width - 15;
                }
                if (y + tooltipRect.height > treeRect.bottom) {
                    y = event.clientY - tooltipRect.height - 15;
                }

                tooltip.style.left = `${Math.max(treeRect.left, x)}px`;
                tooltip.style.top = `${Math.max(treeRect.top, y)}px`;
            })
            .on('mouseout', () => {
                tooltip.style.display = 'none';
                tooltip.style.zIndex = ''; // Reset z-index
            });

        const nodeWidth = 140, nodeHeight = 80;
        node.append('rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 10).attr('ry', 10)
            .attr('fill', d => getAreaColor(d.area));

        const stripeWidth = 8;
        const cornerRadius = 10;
        const x0 = -nodeWidth / 2;
        const y0 = -nodeHeight / 2;
        const x1 = -nodeWidth / 2 + stripeWidth;
        const y1 = nodeHeight / 2;
        const r = cornerRadius;
        const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;
        
        const tierIndicator = node.append('g');
        tierIndicator.append('path')
            .attr('d', pathData)
            .attr('fill', 'white');

        tierIndicator.each(function(d) {
            const tier = parseInt(d.tier) || 0;
            if (tier > 0) {
                const g = d3.select(this);
                const clipId = `clip-${d.id.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
                
                g.append('defs')
                 .append('clipPath')
                 .attr('id', clipId)
                 .append('path')
                 .attr('d', pathData);

                const stripes = g.append('g').attr('clip-path', `url(#${clipId})`);
                const stripeSpacing = 7;
                for (let i = 0; i < tier; i++) {
                    const y = y0 + i * stripeSpacing;
                    stripes.append('line')
                        .attr('stroke', 'black')
                        .attr('stroke-width', 3)
                        .attr('x1', x0 - 5)
                        .attr('y1', y)
                        .attr('x2', x1 + 5)
                        .attr('y2', y + (x1 - x0) + 10);
                }
            }
        });

        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').style('fill', '#ffffff').text(d => d.name ? d.name.substring(0, 18) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').style('font-size', '8px').style('fill', '#ffffff').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');

        popupSimulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    function calculateAndRenderPath(startId, endId) {
        let pathNodes, pathLinks;
        if (endId) {
            const result = calculatePath(startId, endId);
            pathNodes = result.nodes;
            pathLinks = result.links;
        } else {
            const pathNodeIds = getPrerequisites(startId);
            pathNodes = allTechs.filter(t => pathNodeIds.has(t.id));
            pathLinks = [];
            pathNodes.forEach(tech => {
                if (tech.prerequisites) {
                    tech.prerequisites.forEach(prereq => {
                        if (pathNodeIds.has(prereq)) {
                            pathLinks.push({ source: prereq, target: tech.id });
                        }
                    });
                }
            });
        }
        
        const popupContainer = document.getElementById('popup-tech-tree');
        popupContainer.innerHTML = ''; // Clear previous graph
        document.getElementById('popup-viewport').classList.remove('hidden');

        renderPopupGraph(pathNodes, pathLinks);
    }

    function calculatePath(startId, endId) {
        const techMap = new Map(allTechs.map(t => [t.id, t]));
        const adj = new Map();
        allTechs.forEach(t => {
            if (t.prerequisites) {
                t.prerequisites.forEach(p => {
                    if (!adj.has(p)) adj.set(p, []);
                    adj.get(p).push(t.id);
                });
            }
        });

        // Bidirectional BFS
        let qF = [startId], qB = [endId];
        let visitedF = new Map([[startId, [startId]]]), visitedB = new Map([[endId, [endId]]]);
        let path = [];

        while (qF.length > 0 && qB.length > 0) {
            // Forward search
            let currF = qF.shift();
            if (visitedB.has(currF)) {
                path = visitedF.get(currF).concat(visitedB.get(currF).reverse().slice(1));
                break;
            }
            // Descendants
            if (adj.has(currF)) {
                for (const neighbor of adj.get(currF)) {
                    if (!visitedF.has(neighbor)) {
                        let newPath = [...visitedF.get(currF), neighbor];
                        visitedF.set(neighbor, newPath);
                        qF.push(neighbor);
                    }
                }
            }
            // Ancestors
            const techF = techMap.get(currF);
            if (techF && techF.prerequisites) {
                 for (const neighbor of techF.prerequisites) {
                    if (!visitedF.has(neighbor)) {
                        let newPath = [...visitedF.get(currF), neighbor];
                        visitedF.set(neighbor, newPath);
                        qF.push(neighbor);
                    }
                }
            }


            // Backward search
            let currB = qB.shift();
            if (visitedF.has(currB)) {
                path = visitedF.get(currB).concat(visitedB.get(currB).reverse().slice(1));
                break;
            }
            // Ancestors
            const techB = techMap.get(currB);
            if (techB && techB.prerequisites) {
                for (const neighbor of techB.prerequisites) {
                    if (!visitedB.has(neighbor)) {
                        let newPath = [...visitedB.get(currB), neighbor];
                        visitedB.set(neighbor, newPath);
                        qB.push(neighbor);
                    }
                }
            }
            // Descendants
            if (adj.has(currB)) {
                for (const neighbor of adj.get(currB)) {
                    if (!visitedB.has(neighbor)) {
                        let newPath = [...visitedB.get(currB), neighbor];
                        visitedB.set(neighbor, newPath);
                        qB.push(neighbor);
                    }
                }
            }
        }

        const pathNodeIds = new Set(path);
        const pathNodes = allTechs.filter(t => pathNodeIds.has(t.id));
        const pathLinks = [];
        pathNodes.forEach(tech => {
            if (tech.prerequisites) {
                tech.prerequisites.forEach(prereq => {
                    if (pathNodeIds.has(prereq)) {
                        pathLinks.push({ source: prereq, target: tech.id });
                    }
                });
            }
        });

        return { nodes: pathNodes, links: pathLinks };
    }

function getAreaColor(area) {
    switch (area) {
        case 'physics': return '#2a7fff';
        case 'society': return '#36d673';
        case 'engineering': return '#ffb400';
        default: return '#666666';
    }
}


    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
        }
        function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
        }
        return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
    }

    function searchTech() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) return;

        preSearchState = { nodes: [...nodes], links: [...links] };

        const searchScope = searchScopeToggle.checked ? allTechs : nodes;
        const matchedNodes = searchScope.filter(n => (n.name && n.name.toLowerCase().includes(searchTerm)) || (n.id && n.id.toLowerCase().includes(searchTerm)));
        
        if (matchedNodes.length === 0) {
            alert("No results in the current view. Enable Search all techs to search the entire tree.");
            preSearchState = null; // Clear pre-search state if nothing was found
            return;
        }

        // Stop any ongoing simulation from the main views to avoid interference
        try { if (simulation) simulation.stop(); } catch (e) {}

        searchBackButton.style.display = 'block';
        // Preserve glossary inside #tech-tree; only remove previous SVGs
        techTreeContainer.querySelectorAll('svg').forEach(el => el.remove());
        const width = techTreeContainer.clientWidth, height = techTreeContainer.clientHeight;
        // Basic zoom/pan for search results
        const zoom = d3.zoom().on("zoom", (event) => { g.attr("transform", event.transform); });
        svg = d3.select(techTreeContainer).append('svg').attr('width', width).attr('height', height).call(zoom);
        g = svg.append("g");
        // Create layers, like main views, to avoid mixing elements
        g.append('g').attr('class','links-layer');
        g.append('g').attr('class','nodes-layer');

        const searchNodes = matchedNodes.map(tech => ({ ...tech }));
        const nodeWidth = 140, nodeHeight = 80, paddingX = 30, paddingY = 30;
        const nodesPerRow = Math.max(1, Math.floor(width / (nodeWidth + paddingX)));

        const rows = [];
        for (let i = 0; i < searchNodes.length; i += nodesPerRow) {
            rows.push(searchNodes.slice(i, i + nodesPerRow));
        }

        rows.forEach((row, rowIndex) => {
            const rowWidth = row.length * (nodeWidth + paddingX) - paddingX;
            const startX = (width - rowWidth) / 2;
            row.forEach((d, nodeIndex) => {
                d.x = startX + nodeIndex * (nodeWidth + paddingX) + nodeWidth / 2;
                d.y = paddingY + rowIndex * (nodeHeight + paddingY) + nodeHeight / 2;
            });
        });
        // Build a map for quick id -> node lookup
        const idToNode = new Map(searchNodes.map(n => [n.id, n]));
        // Compute links where both ends are in the result set
        const searchLinks = [];
        searchNodes.forEach(tech => {
            if (tech.prerequisites) {
                tech.prerequisites.forEach(pr => {
                    if (idToNode.has(pr)) {
                        searchLinks.push({ source: idToNode.get(pr), target: tech });
                    }
                });
            }
        });

        // Debug: verify how many results/links we are rendering
        try { console.log(`[searchTech] matches: ${searchNodes.length}, links: ${searchLinks.length}, scopeAll: ${!!searchScopeToggle.checked}`); } catch (e) {}

        // Expose data on group and mark layout to keep LOD from interfering
        g.property('layout','search').datum({ nodes: searchNodes, links: searchLinks });

        // Draw links first
        g.select('.links-layer')
            .selectAll('line')
            .data(searchLinks)
            .join('line')
            .attr('class', 'link')
            .attr('stroke', '#e0e0e0ff')
            .attr('stroke-opacity', 0.5)
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        const node = g.select('.nodes-layer').selectAll('g').data(searchNodes).join('g').attr('class', 'tech-node')
            .on('mouseover', (event, d) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', (event) => {
                const treeRect = techTreeContainer.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let x = event.clientX + 15;
                let y = event.clientY + 15;

                if (x + tooltipRect.width > treeRect.right) {
                    x = event.clientX - tooltipRect.width - 15;
                }
                if (y + tooltipRect.height > treeRect.bottom) {
                    y = event.clientY - tooltipRect.height - 15;
                }

                tooltip.style.left = `${Math.max(treeRect.left, x)}px`;
                tooltip.style.top = `${Math.max(treeRect.top, y)}px`;
            })
            .on('mouseout', () => tooltip.style.display = 'none')
            .on('click', (event, d) => {
                window.currentFocusId = d.id;
                searchInput.value = '';
                updateVisualization(speciesSelect.value, d.id, true);
            });
        
        node.append('rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 10).attr('ry', 10)
            .attr('fill', d => getAreaColor(d.area));

        const stripeWidth = 8;
        const cornerRadius = 10;
        const x0 = -nodeWidth / 2;
        const y0 = -nodeHeight / 2;
        const x1 = -nodeWidth / 2 + stripeWidth;
        const y1 = nodeHeight / 2;
        const r = cornerRadius;
        const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;
        
        const tierIndicator = node.append('g');
        tierIndicator.append('path')
            .attr('d', pathData)
            .attr('fill', 'white');

        tierIndicator.each(function(d) {
            const tier = parseInt(d.tier) || 0;
            if (tier > 0) {
                const g = d3.select(this);
                const clipId = `clip-${d.id.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
                
                g.append('defs')
                 .append('clipPath')
                 .attr('id', clipId)
                 .append('path')
                 .attr('d', pathData);

                const stripes = g.append('g').attr('clip-path', `url(#${clipId})`);
                const stripeSpacing = 7;
                for (let i = 0; i < tier; i++) {
                    const y = y0 + i * stripeSpacing;
                    stripes.append('line')
                        .attr('stroke', 'black')
                        .attr('stroke-width', 3)
                        .attr('x1', x0 - 5)
                        .attr('y1', y)
                        .attr('x2', x1 + 5)
                        .attr('y2', y + (x1 - x0) + 10);
                }
            }
        });
            
        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').style('fill', '#ffffff').text(d => d.name ? d.name.substring(0, 18) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').style('font-size', '8px').style('fill', '#ffffff').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    // --- Main Execution Logic ---
    loadSpeciesFilter(); // Load species filter options at startup
    const urlParams = new URLSearchParams(window.location.search);
    const pathStart = urlParams.get('pathStart');
    const pathEnd = urlParams.get('pathEnd');
    const dependenciesFor = urlParams.get('dependenciesFor');

    if (pathStart && pathEnd) {
        // If path params are present, initialize the tree and then render the path.
        prepareUI();
        loadAndRenderTree();
        // We need to wait for the data to be loaded before calculating the path.
        // A simple timeout is a pragmatic way to handle this without complex promise chaining.
        setTimeout(() => {
            selectionStartNode = pathStart;
            selectionEndNode = pathEnd;
            calculateAndRenderPath(pathStart, pathEnd);
        }, 1000); // Wait 1 second for data to likely be loaded.
    } else if (dependenciesFor) {
        // If dependenciesFor param is present, initialize the tree and then render the dependencies.
        prepareUI();
        loadAndRenderTree();
        setTimeout(() => {
            selectionStartNode = dependenciesFor;
            calculateAndRenderPath(dependenciesFor);
        }, 1000);
    } else if (urlParams.toString().length > 0) {
        // If there are other URL params, load the tree immediately.
        prepareUI();
        loadAndRenderTree();
    } else {
        // Otherwise, show the landing card and wait for user interaction.
        treeToolbar.style.display = 'none';
        techTreeContainer.classList.add('hidden');
        landingCard.classList.remove('hidden');

        // These listeners will trigger the UI preparation ONCE.
        const initOnce = { once: true };
        showTreeButton.addEventListener('click', prepareUI, initOnce);
        speciesSelect.addEventListener('mousedown', prepareUI, initOnce);
        areaSelect.addEventListener('mousedown', prepareUI, initOnce);
        searchInput.addEventListener('focus', prepareUI, initOnce);
        layoutSelect.addEventListener('mousedown', prepareUI, initOnce);
        showTierButton.addEventListener('click', prepareUI, initOnce);
        searchButton.addEventListener('click', prepareUI, initOnce);
    }
    
});
