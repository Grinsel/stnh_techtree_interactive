import { updateLOD, calculateAndRenderPath as calculateAndRenderPathController } from './js/render.js';
import { buildLinksFromPrereqs, getConnectedTechIds, getPrerequisites as getPrerequisitesData, calculatePath as calculatePathData, loadTechnologyData, getAllTechsCached, isTechDataLoaded } from './js/data.js';
import { filterTechsByTier as filterTechsByTierData, filterTechs, loadSpeciesFilter } from './js/filters.js';
import { handleSearch as executeSearch } from './js/search.js';
import { renderForceDirectedArrowsGraph as arrowsLayout } from './js/ui/layouts/arrows.js';
import { renderForceDirectedGraph as forceLayout } from './js/ui/layouts/force.js';
import { renderDisjointForceDirectedGraph as disjointLayout } from './js/ui/layouts/disjoint.js';
import { loadState, saveState, applyState, resetState, setCookie, getCookie } from './js/state.js';
import { drag } from './js/ui/drag.js';
import { switchTab } from './js/ui/tabs.js';
import { getSelectedTierRange } from './js/ui/tiers.js';
import { layoutAsGrid } from './js/ui/layouts/grid.js';
import { renderGraph as dispatchRenderGraph } from './js/render.js';
import { createHandleNodeSelection } from './js/ui/selection.js';
import { renderPopupGraph } from './js/ui/popup.js';
import { attachEventHandlers } from './js/ui/events.js';
import { updateHistoryButtons } from './js/ui/history.js';

// Global SVG and group so LOD can access current transform and selections
let svg = null;
let g = null;
let zoom = null;


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

    // --- Create persistent UI elements ---
    const jumpButton = document.createElement('button');
    jumpButton.id = 'jump-to-tech-btn';
    jumpButton.textContent = 'Jump to Tech';
    jumpButton.style.width = '100%';
    jumpButton.style.padding = '8px 10px';
    jumpButton.style.background = '#232b3d';
    jumpButton.style.color = '#eaf2ff';
    jumpButton.style.border = '1px solid #3c80ff88';
    jumpButton.style.borderRadius = '8px';
    jumpButton.style.marginTop = '12px';
    jumpButton.style.fontSize = '1rem';
    jumpButton.style.fontFamily = 'var(--font)';
    jumpButton.style.cursor = 'pointer';
    jumpButton.style.display = 'none'; // Initially hidden
    jumpButton.addEventListener('mouseover', () => {
        jumpButton.style.background = '#3c4b7a';
        jumpButton.style.borderColor = '#3c80ff';
    });
    jumpButton.addEventListener('mouseout', () => {
        jumpButton.style.background = '#232b3d';
        jumpButton.style.borderColor = '#3c80ff88';
    });
    jumpButton.addEventListener('click', () => zoomToTech(activeTechId));
    
    const hr = document.createElement('hr');
    hr.id = 'jump-to-tech-hr';
    hr.style.display = 'none'; // Initially hidden
    hr.style.border = 'none';
    hr.style.borderTop = '1px solid #34405a';
    hr.style.marginTop = '12px';

    techDetailsContent.appendChild(hr);
    techDetailsContent.appendChild(jumpButton);

    // --- Reusable Actions ---
    function zoomToTech(techId) {
        if (!svg || !zoom || !techId) return;

        const targetNode = nodes.find(n => n.id === techId);
        if (!targetNode || typeof targetNode.x === 'undefined') {
            // This case is handled by the search logic, but we can keep the alert for the button
            if (document.activeElement === jumpButton) {
                alert('Technology is not visible in the current view.');
            }
            return;
        }

        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;
        const scale = 1.2;
        
        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-targetNode.x, -targetNode.y);

        svg.transition()
            .duration(750)
            .call(zoom.transform, transform);
    }
    window.zoomToTech = zoomToTech; // Make it globally accessible for the search module

    function setActiveTech(techId) {
        // Clear previous search highlight
        if (lastSearchedTechId && g) {
            g.selectAll('.tech-node')
                .filter(d => d.id === lastSearchedTechId)
                .select('rect')
                .attr('stroke', null)
                .attr('stroke-width', null);
        }

        if (techId && g) {
            // Apply new search highlight
            g.selectAll('.tech-node')
                .filter(d => d.id === techId)
                .select('rect')
                .attr('stroke', 'magenta')
                .attr('stroke-width', 3);
        }

        // Update state for the new search
        lastSearchedTechId = techId;
        activeTechId = techId;
        
        // Update details panel
        const techSource = getAllTechsCached() || allTechs;
        const tech = techId ? techSource.find(t => t.id === techId) : null;
        renderTechDetails(tech);

        // We no longer call handleNodeSelection as it's for the yellow border, 
        // and we want a distinct magenta border for search.
    }
    window.setActiveTech = setActiveTech;


    // --- State Variables ---
    let lastSearchedTechId = null;
    let selectionStartNode = null;
    let selectionEndNode = null;
    let navigationHistory = [];
    let historyIndex = -1;
    let isTreeInitialized = false;
    let allTechs = [];
    let nodes = [];
    let links = [];
    let preSearchState = null;
    let simulation;
    let activeTechId = null;
    let tierFilterActive = false;
    // Selection handler bound to current state (created after state vars exist)
    const handleNodeSelection = createHandleNodeSelection({
        getG: () => g,
        getActiveTechId: () => activeTechId,
        getSelection: () => ({ selectionStartNode, selectionEndNode }),
        setSelection: (start, end) => { selectionStartNode = start; selectionEndNode = end; },
    });


    // --- Core Initialization Functions ---
    function prepareUI() {
        if (isTreeInitialized) return;
        isTreeInitialized = true;
        // Mark landing as seen once the UI is prepared
        try { setCookie('landing_seen', '1', 365); } catch (e) {}

        // Hide landing card and show the tree view
        landingCard.classList.add('hidden');
        treeToolbar.style.display = 'flex';
        techTreeContainer.classList.remove('hidden');
        viewLegend.classList.remove('hidden');

        // Pre-load data as soon as the UI is ready
        loadTechnologyData().then(data => { if (Array.isArray(data)) { allTechs = data; } });

        // Set up permanent event listeners via centralized module
        attachEventHandlers({
            elements: {
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
            },
            state: {
                getActiveTechId: () => activeTechId,
                setTierFilterActive: (v) => { tierFilterActive = !!v; },
            },
            actions: {
                updateVisualization: (...args) => window.updateVisualization(...args),
                saveState,
                switchTab: (tab) => switchTab(tab),
                getSelectedTierRange,
                handleSearch: () => {
                    const searchTerm = searchInput.value.trim();
                    if (!searchTerm) return;

                    loadTechnologyData().then(allTechs => {
                        preSearchState = { nodes: [...nodes], links: [...links] };

                        const result = executeSearch({
                            searchTerm,
                            searchAll: !!searchScopeToggle.checked,
                            allTechs,
                            currentNodes: nodes,
                            currentLinks: links,
                            techTreeContainer,
                            tooltipEl: tooltip,
                            searchBackButtonEl: searchBackButton,
                            speciesSelectEl: speciesSelect,
                            updateVisualization,
                            simulation,
                            layoutAsGrid,
                            zoomToTech: window.zoomToTech,
                        });

                        if (!result) { preSearchState = null; return; }
                        // Update globals for LOD/zoom consistency
                        svg = result.svg;
                        g = result.g;
                        nodes = result.nodes;
                        links = result.links;
                    });
                },
                setCookie,
                calculateAndRenderPath: (startId, endId) => {
                    const popupContainer = document.getElementById('popup-tech-tree');
                    const popupViewport = document.getElementById('popup-viewport');
                    calculateAndRenderPathController(startId, endId, allTechs, {
                        popupViewportEl: popupViewport,
                        popupContainerEl: popupContainer,
                        tooltipEl: tooltip,
                        techTreeContainerEl: techTreeContainer,
                        renderPopupGraph,
                        getPrerequisitesData,
                        calculatePathData,
                        drag,
                    });
                },
                updateLOD: () => updateLOD(svg, g),
                resetState,
                getSelection: () => ({ selectionStartNode, selectionEndNode }),
                loadAndRenderTree,
                onSearchBack: () => {
                    if (preSearchState) {
                        const selectedLayout = document.getElementById('layout-select').value;
                        // Re-render from preSearchState nodes; rebuild links for consistency
                        renderTree({
                            filteredTechs: preSearchState.nodes,
                            selectedLayout,
                            selectedSpecies: speciesSelect.value,
                        });
                        nodes = preSearchState.nodes;
                        links = buildLinksFromPrereqs(nodes);
                        preSearchState = null;
                        searchBackButton.style.display = 'none';
                    }
                },
            },
        });
    }

    

    function loadAndRenderTree() {
        // Ensure the UI is prepared so the container has a size
        prepareUI();
        
        loadTechnologyData().then(data => {
            if (Array.isArray(data)) { allTechs = data; }
            // If data is already loaded, just re-render with current filters
            const currentState = loadState();
            if (!currentState.species) {
                currentState.species = 'Federation';
            }
            applyState(currentState);
            tierFilterActive = false; // Do not activate tier filter by default
            
            // Validate initial focus exists in dataset
            const initialFocusValid = currentState.focus && data.some(t => t.id === currentState.focus);
            window.currentFocusId = initialFocusValid ? currentState.focus : null;
            activeTechId = window.currentFocusId;

            if (activeTechId) {
                navigationHistory = [activeTechId];
                historyIndex = 0;
            }

            updateVisualization(currentState.species, activeTechId, false);
        });
    }

    // --- Visualization and Helper Functions ---

    function formatTooltip(d) {
        const techSource = getAllTechsCached() || allTechs;
        const nameById = new Map(techSource.map(t => [t.id, t.name]));

        const prerequisites = (d.prerequisites || []).map(id => nameById.get(id) || id).join(', ');
        const unlocksByType = (d.unlocks || []).reduce((acc, u) => {
            if (typeof u === 'object' && u !== null) {
                const type = u.type || 'unknown';
                if (!acc[type]) {
                    acc[type] = [];
                }
                acc[type].push(u.label || u.id);
            }
            return acc;
        }, {});

        let unlocksHtml = '';
        for (const type in unlocksByType) {
            unlocksHtml += `<strong>${type}:</strong> ${unlocksByType[type].join(', ')}<br>`;
        }

        return `
            <strong>name:</strong> ${d.name}<br>
            <strong>id:</strong> ${d.id}<br>
            <strong>area:</strong> ${d.area}<br>
            <strong>category:</strong> ${d.category}<br>
            <strong>tier:</strong> ${d.tier}<br>
            <strong>cost:</strong> ${d.cost}<br>
            <strong>prerequisites:</strong> ${prerequisites}<br>
            <strong>weight:</strong> ${d.weight}<br>
            <strong>Access:</strong> ${d.required_species ? d.required_species.join(', ') : 'All'}<br>
            <strong>Unlocks:</strong><br>${unlocksHtml}
        `;
    }

    // History buttons UI is handled in './js/ui/history.js'

    // --- Streamlined Helpers ---
    function renderTechDetails(tech) {
        const jumpBtn = document.getElementById('jump-to-tech-btn');
        const hrSep = document.getElementById('jump-to-tech-hr');

        const html = tech ? formatTooltip(tech) : '<p>Click on a technology to see its details here.</p>';
        techDetailsContent.innerHTML = html;
        if (hrSep) techDetailsContent.appendChild(hrSep);
        if (jumpBtn) techDetailsContent.appendChild(jumpBtn);

        if (tech) {
            if (jumpBtn) jumpBtn.style.display = 'block';
            if (hrSep) hrSep.style.display = 'block';
            switchTab('details');
        } else {
            if (jumpBtn) jumpBtn.style.display = 'none';
            if (hrSep) hrSep.style.display = 'none';
        }
    }

    function applyFilters({ selectedSpecies, activeTechId }) {
        const selectedArea = areaSelect.value;
        const isExclusive = speciesExclusiveToggle.checked;

        // Base species/area filtering via data module (no active focus here yet)
        const sourceTechs = getAllTechsCached() || allTechs;
        let baseTechs = filterTechs({
            techs: sourceTechs,
            species: selectedSpecies,
            isExclusive,
            area: selectedArea,
            tierRange: { startTier: 0, endTier: 99 },
            activeTechId: null,
        });

        // Apply connected filter using full graph for traversal, then intersect with base set
        let filteredTechs;
        let clearedFocus = false;
        if (activeTechId) {
            const connectedIds = getConnectedTechIds(activeTechId, sourceTechs);
            filteredTechs = baseTechs.filter(t => connectedIds.has(t.id));
            // If no nodes found (e.g., stale focus), clear focus and fall back
            if (filteredTechs.length === 0) {
                clearedFocus = true;
                filteredTechs = baseTechs;
            }
        } else {
            filteredTechs = baseTechs;
        }

        // Preserve pre-tier-filter set for fallback if tier filter eliminates all nodes
        const preTierFiltered = filteredTechs;
        if (tierFilterActive) {
            const { startTier, endTier } = getSelectedTierRange();
            filteredTechs = filterTechsByTierData(filteredTechs, { startTier, endTier });
            if (filteredTechs.length === 0) {
                // Fallback: render without tier filter to avoid empty view
                filteredTechs = preTierFiltered;
            }
        }
        return { filteredTechs, clearedFocus };
    }

    function renderTree({ filteredTechs, selectedLayout, selectedSpecies, onEnd }) {
        updateHistoryButtons({ backButton, forwardButton, navigationHistory, historyIndex });
        techCounter.textContent = `Displayed Technologies: ${filteredTechs.length}`;
        // Hide centered button only if nodes are visible
        const centerBtn = document.getElementById('load-tree-center-button');
        if (centerBtn && filteredTechs.length > 0) centerBtn.style.display = 'none';
        // Ensure toolbar reload button is visible after first render
        const toolbarBtn = document.getElementById('load-tree-button');
        if (toolbarBtn) toolbarBtn.style.display = '';
        // Preserve glossary inside #tech-tree; only remove previous SVGs
        techTreeContainer.querySelectorAll('svg').forEach(el => el.remove());
        nodes = filteredTechs.map(tech => ({ ...tech }));
        // Build links via data helper
        links = buildLinksFromPrereqs(nodes);

        const res = dispatchRenderGraph(
            selectedLayout,
            nodes,
            links,
            selectedSpecies,
            techTreeContainer,
            {
                updateLOD: () => updateLOD(svg, g),
                drag,
                tooltipEl: tooltip,
                techTreeContainerEl: techTreeContainer,
                handleNodeSelection,
                updateVisualization,
                activeTechId,
                selectionStartNode,
                selectionEndNode,
                // layout implementations
                arrowsLayout,
                forceLayout,
                disjointLayout,
                onEnd,
            }
        );
        if (res && res.svg && res.g) {
            svg = res.svg;
            g = res.g;
            zoom = res.zoom;
        }
    }


    window.updateVisualization = function(selectedSpecies, highlightId = null, addToHistory = true, zoomOnEndId = null) {
        // Ensure UI is visible and data is available before attempting to render
        if (techTreeContainer.classList.contains('hidden')) {
            prepareUI();
        }
        if (!isTechDataLoaded()) {
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
        // Ensure local cache is up-to-date
        allTechs = getAllTechsCached() || allTechs;
        const selectedArea = areaSelect.value;
        const selectedLayout = layoutSelect.value;

        // Filter and potentially clear focus if disconnected
        const { filteredTechs, clearedFocus } = applyFilters({ selectedSpecies, activeTechId });
        if (clearedFocus) {
            activeTechId = null;
            window.currentFocusId = null;
        }

        // Update details panel based on (potentially) updated focus
        const techSource = getAllTechsCached() || allTechs;
        const tech = activeTechId ? techSource.find(t => t.id === activeTechId) : null;
        renderTechDetails(tech);

        // Render tree
        renderTree({ filteredTechs, selectedLayout, selectedSpecies, onEnd: zoomOnEndId ? () => zoomToTech(zoomOnEndId) : null });
    }

    

    

    // --- Main Execution Logic ---
    // Load species filter options at startup
    loadSpeciesFilter(speciesSelect, {
        onLoaded: () => {
            const initialState = loadState();
            applyState(initialState);
        }
    });
    const urlParams = new URLSearchParams(window.location.search);
    const pathStart = urlParams.get('pathStart');
    const pathEnd = urlParams.get('pathEnd');
    const dependenciesFor = urlParams.get('dependenciesFor');

    if (pathStart && pathEnd) {
        // If path params are present, initialize the tree and then render the path.
        prepareUI();
        loadAndRenderTree();
        // Wait for data to be loaded before calculating the path.
        loadTechnologyData().then(() => {
            allTechs = getAllTechsCached() || allTechs;
            selectionStartNode = pathStart;
            selectionEndNode = pathEnd;
            const popupContainer = document.getElementById('popup-tech-tree');
            const popupViewport = document.getElementById('popup-viewport');
            calculateAndRenderPathController(pathStart, pathEnd, getAllTechsCached() || allTechs, {
                popupViewportEl: popupViewport,
                popupContainerEl: popupContainer,
                tooltipEl: tooltip,
                techTreeContainerEl: techTreeContainer,
                renderPopupGraph,
                getPrerequisitesData,
                calculatePathData,
                drag,
            });
        });
    } else if (dependenciesFor) {
        // If dependenciesFor param is present, initialize the tree and then render the dependencies.
        prepareUI();
        loadAndRenderTree();
        loadTechnologyData().then(() => {
            allTechs = getAllTechsCached() || allTechs;
            selectionStartNode = dependenciesFor;
            const popupContainer = document.getElementById('popup-tech-tree');
            const popupViewport = document.getElementById('popup-viewport');
            calculateAndRenderPathController(dependenciesFor, undefined, allTechs, {
                popupViewportEl: popupViewport,
                popupContainerEl: popupContainer,
                tooltipEl: tooltip,
                techTreeContainerEl: techTreeContainer,
                renderPopupGraph,
                getPrerequisitesData,
                calculatePathData,
                drag,
            });
        });
    } else if (urlParams.toString().length > 0) {
        // If there are other URL params, load the tree immediately.
        prepareUI();
        loadAndRenderTree();
    } else if (getCookie('landing_seen') === '1') {
        // If the user has previously seen the landing card, skip it.
        prepareUI();
    } else {
        // Otherwise, show the landing card and wait for user interaction.
        treeToolbar.style.display = 'none';
        techTreeContainer.classList.add('hidden');
        landingCard.classList.remove('hidden');
        try { setCookie('landing_seen', '1', 365); } catch (e) {}

        // These listeners will trigger the UI preparation ONCE.
        const initOnce = { once: true };
        showTreeButton.addEventListener('click', prepareUI, initOnce);
        speciesSelect.addEventListener('mousedown', prepareUI, initOnce);
        areaSelect.addEventListener('mousedown', prepareUI, initOnce);
        searchInput.addEventListener('focus', prepareUI, initOnce);
        layoutSelect.addEventListener('mousedown', prepareUI, initOnce);
        showTierButton.addEventListener('click', prepareUI, initOnce);
        
        // Special handler for the first search click
        const initialSearchHandler = () => {
            prepareUI();
            // The 'real' search handler is now attached, so we can trigger it.
            searchButton.click();
        };
        searchButton.addEventListener('click', initialSearchHandler, initOnce);
    }
    
});
