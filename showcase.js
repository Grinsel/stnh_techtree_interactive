import { updateLOD, calculateAndRenderPath as calculateAndRenderPathController, formatTooltip, createSvgFor, getAreaColor } from './js/render.js';
import { buildLinksFromPrereqs, getConnectedTechIds, getPrerequisites as getPrerequisitesData, calculateAllPaths, loadTechnologyData, getAllTechsCached, isTechDataLoaded, filterTechsByFaction, isFactionExclusive } from './js/data.js';  // NEW Phase 2: added filterTechsByFaction, isFactionExclusive
import { filterTechsByTier as filterTechsByTierData, filterTechs, loadSpeciesFilter, loadCategoryFilter } from './js/filters.js';
import { handleSearch as executeSearch } from './js/search.js';
import { renderForceDirectedArrowsGraph as arrowsLayout } from './js/ui/layouts/arrows.js';
import { renderForceDirectedGraph as forceLayout } from './js/ui/layouts/force.js';
import { renderDisjointForceDirectedGraph as disjointLayout } from './js/ui/layouts/disjoint.js';
import { layoutByTier } from './js/ui/layouts/tier.js';
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
import { initFactionDropdown, registerFactionEvents, getCurrentFaction } from './js/factions.js';  // NEW Phase 2

// Global SVG and group so LOD can access current transform and selections
let svg = null;
let g = null;
let zoom = null;


document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const speciesSelect = document.getElementById('species-select');
    const factionExclusiveToggle = document.getElementById('faction-exclusive-toggle');  // Phase 2: Renamed
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchBackButton = document.getElementById('search-back-button');
    const searchScopeToggle = document.getElementById('search-scope-toggle');
    const searchNameOnlyToggle = document.getElementById('search-name-only-toggle');
    const techTreeContainer = document.getElementById('tech-tree');
    const tooltip = document.getElementById('tooltip');
    const areaSelect = document.getElementById('area-select');
    const categorySelect = document.getElementById('category-select');
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
    const toggleLayoutButton = document.getElementById('toggle-layout-button');
    const zoomInButton = document.getElementById('zoom-in-button');
    const zoomOutButton = document.getElementById('zoom-out-button');

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
    let lastLayout = 'force-directed';
    let isTierBasedLayout = false;
    // Selection handler bound to current state (created after state vars exist)
    const handleNodeSelection = createHandleNodeSelection({
        getG: () => g,
        getActiveTechId: () => activeTechId,
        getSelection: () => ({ selectionStartNode, selectionEndNode }),
        setSelection: (start, end) => { selectionStartNode = start; selectionEndNode = end; },
    });

    // --- Path Highlighting ---
    function findPathToActive(startNodeId, activeNodeId, allNodes) {
        if (!startNodeId || !activeNodeId) return { nodes: [], links: [] };

        const nodeMap = new Map(allNodes.map(n => [n.id, n]));
        const allPathNodes = new Set();
        const allPathLinks = new Set();

        function findAllPathsRecursive(currentNodeId, currentPathNodes, currentPathLinks, visited) {
            const currentNode = nodeMap.get(currentNodeId);
            if (!currentNode || visited.has(currentNodeId)) {
                return;
            }

            visited.add(currentNodeId);
            currentPathNodes.add(currentNodeId);

            if (currentNodeId === activeNodeId) {
                currentPathNodes.forEach(nodeId => allPathNodes.add(nodeId));
                currentPathLinks.forEach(linkId => allPathLinks.add(linkId));
            } else if (currentNode.prerequisites) {
                for (const prereqId of currentNode.prerequisites) {
                    if (nodeMap.has(prereqId)) {
                        const newPathLinks = new Set(currentPathLinks);
                        newPathLinks.add(`${prereqId}-${currentNodeId}`);
                        findAllPathsRecursive(prereqId, new Set(currentPathNodes), newPathLinks, new Set(visited));
                    }
                }
            }
        }

        findAllPathsRecursive(startNodeId, new Set(), new Set(), new Set());

        return { nodes: Array.from(allPathNodes), links: Array.from(allPathLinks) };
    }

    function highlightPath(path) {
        if (!g) return;
        clearHighlight(); // Clear any previous highlight
        g.selectAll('.link')
            .filter(d => path.links.includes(`${d.source.id}-${d.target.id}`))
            .classed('path-highlight', true);
        
        g.selectAll('.tech-node')
            .filter(d => path.nodes.includes(d.id))
            .classed('path-highlight', true);
    }

    function clearHighlight() {
        if (!g) return;
        g.selectAll('.link.path-highlight').classed('path-highlight', false);
        g.selectAll('.tech-node.path-highlight').classed('path-highlight', false);
    }


    // --- History Navigation ---
    function navigateBack() {
        if (historyIndex > 0) {
            historyIndex--;
            const species = speciesSelect.value;
            const techId = navigationHistory[historyIndex];
            // Call updateVisualization without adding to history
            window.updateVisualization(species, techId, false);
        }
    }

    function navigateForward() {
        if (historyIndex < navigationHistory.length - 1) {
            historyIndex++;
            const species = speciesSelect.value;
            const techId = navigationHistory[historyIndex];
            // Call updateVisualization without adding to history
            window.updateVisualization(species, techId, false);
        }
    }


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
                factionExclusiveToggle,
                searchInput,
                searchButton,
                searchBackButton,
                searchScopeToggle,
                techTreeContainer,
                tooltip,
                areaSelect,
                categorySelect,
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
                zoomInButton,
                zoomOutButton,
            },
            state: {
                getActiveTechId: () => activeTechId,
                setTierFilterActive: (v) => { tierFilterActive = !!v; },
            },
            actions: {
                navigateBack,
                navigateForward,
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
                            nameOnly: !!searchNameOnlyToggle.checked,
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
                        calculateAllPaths,
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
                resetViewToFullTree: () => {
                    isTierBasedLayout = false;
                    layoutSelect.value = 'force-directed';
                    saveState();
                    updateVisualization(speciesSelect.value, null, false);
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


    // History buttons UI is handled in './js/ui/history.js'

    // --- Streamlined Helpers ---
    function renderTechDetails(tech) {
        const jumpBtn = document.getElementById('jump-to-tech-btn');
        const hrSep = document.getElementById('jump-to-tech-hr');

        // NEW Phase 2: Pass current faction to tooltip
        const html = tech ? formatTooltip(tech, getCurrentFaction()) : '<p>Click on a technology to see its details here.</p>';
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
        const selectedCategory = categorySelect.value;
        const isExclusive = factionExclusiveToggle.checked;

        // Base species/area filtering via data module (no active focus here yet)
        const sourceTechs = getAllTechsCached() || allTechs;
        let baseTechs = filterTechs({
            techs: sourceTechs,
            species: selectedSpecies,
            isExclusive,
            area: selectedArea,
            category: selectedCategory,
            tierRange: { startTier: 0, endTier: 99 },
            activeTechId: null,
        });

        // NEW Phase 2: Apply faction filter
        const currentFaction = getCurrentFaction();
        if (currentFaction && currentFaction !== 'all') {
            baseTechs = filterTechsByFaction(baseTechs, currentFaction);

            // NEW Phase 2: Apply faction-exclusive filter if toggle is active
            if (isExclusive) {
                baseTechs = baseTechs.filter(tech => isFactionExclusive(tech, currentFaction));
            }
        }

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

    function renderTierBasedGraph(nodes, links, selectedSpecies, container, deps) {
        const {
            tooltipEl,
            techTreeContainerEl,
            handleNodeSelection,
            updateVisualization,
            activeTechId,
            selectionStartNode,
            selectionEndNode,
            onEnd,
        } = deps || {};

        const { svg: _svg, g: _g, zoom, width, height } = createSvgFor(container, () => applyLOD());
        let applyLOD = () => updateLOD(_svg, _g);

        const defs = _svg.append('defs');
        const gradients = {
            society: ['#3a3a3a', getAreaColor('society')],
            engineering: ['#3a3a3a', getAreaColor('engineering')],
            physics: ['#3a3a3a', getAreaColor('physics')],
        };
        for (const [area, colors] of Object.entries(gradients)) {
            const gradient = defs
                .append('linearGradient')
                .attr('id', `gradient-${area}`)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '100%')
                .attr('y2', '0%');
            gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[0]);
            gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[1]);
        }

        const filter = defs.append('filter')
            .attr('id', 'drop-shadow')
            .attr('height', '130%');
        filter.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 3)
            .attr('result', 'blur');
        filter.append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 3)
            .attr('dy', 3)
            .attr('result', 'offsetBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'offsetBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const nodeWidth = 140, nodeHeight = 80;
        const tierPositions = layoutByTier(nodes, width, height, { nodeWidth, nodeHeight });

        // Hydrate links with node object references now that positions are calculated
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        links.forEach(link => {
            link.source = nodeMap.get(link.source) || link.source;
            link.target = nodeMap.get(link.target) || link.target;
        });

        _g
            .select('.links-layer')
            .selectAll('.link')
            .data(links)
            .join('line')
            .attr('class', 'link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke', '#555')
            .attr('stroke-width', 1.5);

        const tierLayer = _g.insert('g', '.nodes-layer').attr('class', 'tier-layer');

        function drawTierLines() {
            tierLayer.selectAll('*').remove();
            const transform = d3.zoomTransform(_svg.node());
            const topY = -transform.y / transform.k;

            for (const tier in tierPositions) {
                const tierX = tierPositions[tier];
                tierLayer.append('line')
                    .attr('x1', tierX)
                    .attr('y1', topY)
                    .attr('x2', tierX)
                    .attr('y2', topY + height / transform.k)
                    .attr('stroke', '#444')
                    .attr('stroke-width', 1 / transform.k)
                    .attr('stroke-dasharray', '5,5');

                tierLayer.append('text')
                    .attr('x', tierX)
                    .attr('y', topY + 20 / transform.k)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#888')
                    .style('font-size', `${12 / transform.k}px`)
                    .text(`Tier ${tier}`);
            }
        }

        drawTierLines();
        zoom.on('zoom', (event) => {
            _g.attr('transform', event.transform);
            drawTierLines();
            applyLOD();
        });

        const node = _g
            .select('.nodes-layer')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .attr('class', 'tech-node')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .on('mouseover', (event, d) => {
                tooltipEl.style.display = 'block';
                // NEW Phase 2: Pass current faction to tooltip
                tooltipEl.innerHTML = formatTooltip(d, getCurrentFaction());

                if (activeTechId && d.id !== activeTechId) {
                    const path = findPathToActive(d.id, activeTechId, nodes);
                    if (path.nodes.length > 0) {
                        highlightPath(path);
                    }
                }
            })
            .on('mousemove', (event) => {
                const treeRect = techTreeContainerEl.getBoundingClientRect();
                const tooltipRect = tooltipEl.getBoundingClientRect();
                let x = event.clientX + 15;
                let y = event.clientY + 15;
                if (x + tooltipRect.width > treeRect.right) x = event.clientX - tooltipRect.width - 15;
                if (y + tooltipRect.height > treeRect.bottom) y = event.clientY - tooltipRect.height - 15;
                tooltipEl.style.left = `${Math.max(treeRect.left, x)}px`;
                tooltipEl.style.top = `${Math.max(treeRect.top, y)}px`;
            })
            .on('mouseout', () => {
                tooltipEl.style.display = 'none';
                clearHighlight();
            })
            .on('click', (event, d) => {
                window.currentFocusId = d.id;
                updateVisualization(selectedSpecies, d.id, true);
            })
            .on('contextmenu', (event, d) => {
                event.preventDefault();
                handleNodeSelection(d);
            });

        node
            .append('rect')
            .attr('class', 'node-rect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('x', -nodeWidth / 2)
            .attr('y', -nodeHeight / 2)
            .attr('rx', 10)
            .attr('ry', 10)
            .attr('fill', (d) => (d.area ? `url(#gradient-${d.area})` : getAreaColor(d.area)))
            .style('filter', 'url(#drop-shadow)')
            .attr('stroke', (d) => {
                // Priority: selection states > faction-exclusive > none
                if (d.id === activeTechId) return 'yellow';
                if (d.id === selectionStartNode) return 'lime';
                if (d.id === selectionEndNode) return 'red';

                // NEW Phase 2: Faction-exclusive highlighting (Gold border)
                const currentFaction = getCurrentFaction();
                if (isFactionExclusive(d, currentFaction)) {
                    return '#ffd700';  // Gold
                }

                return 'none';
            })
            .attr('stroke-width', (d) => {
                // NEW Phase 2: Thicker stroke for faction-exclusive
                if (d.id === activeTechId || d.id === selectionStartNode || d.id === selectionEndNode) {
                    return 4;
                }

                const currentFaction = getCurrentFaction();
                if (isFactionExclusive(d, currentFaction)) {
                    return 3;  // Thicker for faction-exclusive
                }

                return 1;
            })
            .attr('stroke-width', (d) =>
                d.id === activeTechId || d.id === selectionStartNode || d.id === selectionEndNode ? 3 : 1
            );

        applyLOD();
        if (typeof onEnd === 'function') onEnd();

        return { svg: _svg, g: _g, zoom: zoom };
    }

    function renderTree({ filteredTechs, selectedLayout, selectedSpecies, onEnd }) {
        updateHistoryButtons({ backButton, forwardButton, navigationHistory, historyIndex });
        techCounter.textContent = `Displayed Technologies: ${filteredTechs.length}`;
        if (!isTierBasedLayout) {
            lastLayout = selectedLayout;
        }
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

        let res;
        if (isTierBasedLayout) {
            res = renderTierBasedGraph(nodes, links, selectedSpecies, techTreeContainer, {
                tooltipEl: tooltip,
                techTreeContainerEl: techTreeContainer,
                handleNodeSelection,
                updateVisualization,
                activeTechId,
                selectionStartNode,
                selectionEndNode,
                onEnd,
            });
        } else {
            res = dispatchRenderGraph(
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
        }
        if (res && res.svg && res.g) {
            svg = res.svg;
            g = res.g;
            zoom = res.zoom;
            // Expose to window for zoom controls
            window.svg = svg;
            window.zoom = zoom;
        }
    }


    window.updateVisualization = function(selectedSpecies, highlightId = null, addToHistory = true, zoomOnEndId = null) {
        const toggleLayoutButton = document.getElementById('toggle-layout-button');
        if (highlightId) {
            toggleLayoutButton.style.display = 'inline-block';
            // Only default to tier-based layout if entering a branch from the main view
            if (activeTechId === null) {
                isTierBasedLayout = true;
            }
        } else {
            toggleLayoutButton.style.display = 'none';
            isTierBasedLayout = false; // Always reset when returning to the main tree
        }

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
    // NEW Phase 2: Initialize faction dropdown
    initFactionDropdown().then(() => {
        registerFactionEvents();
        console.log('[Phase 2] Faction system initialized');
    }).catch(err => console.error('[Phase 2] Faction initialization failed:', err));

    // Load species filter options at startup
    let categoriesLoaded = false;
    loadSpeciesFilter(speciesSelect, {
        onLoaded: () => {
            if (!categoriesLoaded) {
                categoriesLoaded = true;
                loadCategoryFilter(categorySelect, {
                    onLoaded: () => {
                        const initialState = loadState();
                        applyState(initialState);
                        // Add event listener for category select after it's populated
                        categorySelect.addEventListener('change', () => {
                            window.updateVisualization(speciesSelect.value, null, false);
                            saveState();
                        });
                    }
                });
            }
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
                calculateAllPaths,
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
                calculateAllPaths,
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

    toggleLayoutButton.addEventListener('click', () => {
        isTierBasedLayout = !isTierBasedLayout;
        const layoutToRender = isTierBasedLayout ? 'tier-based' : lastLayout;
        document.getElementById('layout-select').value = lastLayout;
        updateVisualization(speciesSelect.value, activeTechId, false);
        saveState();
    });

    // Initially hide the toggle button
    document.getElementById('toggle-layout-button').style.display = 'none';
});
