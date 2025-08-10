const DEFAULT_STATE = {
    species: "all",
    area: "all",
    layout: "force-directed",
    search: "",
    tierStart: "0",
    tierEnd: "11",
    focus: null
};

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
        return raw ? JSON.parse(raw) : DEFAULT_STATE;
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
        focus: window.currentFocusId || null
    };
    try {
        localStorage.setItem("techTreeState", JSON.stringify(state));
    } catch (e) {
        console.warn("Could not save state:", e);
    }
}

function applyState(state) {
    document.getElementById("species-select").value = state.species;
    document.getElementById("area-select").value = state.area;
    document.getElementById("layout-select").value = state.layout;
    document.getElementById("search-input").value = state.search;
    document.getElementById("start-tier-select").value = state.tierStart;
    document.getElementById("end-tier-select").value = state.tierEnd;
}

function resetState() {
    localStorage.removeItem("techTreeState");
    window.location.search = ''; // Clear URL params and reload
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const speciesSelect = document.getElementById('species-select');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
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
    const backButton = document.getElementById('back-button');
    const forwardButton = document.getElementById('forward-button');
    const generalTab = document.getElementById('general-tab');
    const detailsTab = document.getElementById('details-tab');
    const generalPanel = document.getElementById('general-panel');
    const detailsPanel = document.getElementById('details-panel');
    const techDetailsContent = document.getElementById('tech-details-content');
    const sidebar = document.getElementById('sidebar');

    // --- State Variables ---
    let selectionStartNode = null;
    let selectionEndNode = null;
    let navigationHistory = [];
    let historyIndex = -1;
    let isTreeInitialized = false;
    let allTechs = [];
    let allSpecies = new Set();
    let nodes = [];
    let simulation, svg, g;
    let activeTechId = null;
    let tierFilterActive = false;

    // --- Core Initialization Function ---
    function initializeTree() {
        if (isTreeInitialized) return;
        isTreeInitialized = true;

        // Hide landing card and show the tree view
        landingCard.classList.add('hidden');
        treeToolbar.style.display = 'flex';
        techTreeContainer.classList.remove('hidden');

        // Set up permanent event listeners now that the tree is active
        setupEventListeners();

        // Fetch data and render the tree for the first time
        fetch('assets/technology.json')
            .then(response => response.json())
            .then(data => {
                allTechs = data;
                allTechs.forEach(tech => {
                    if (tech.required_species && tech.required_species.length > 0) {
                        tech.required_species.forEach(species => allSpecies.add(species));
                    }
                });

                const sortedSpecies = Array.from(allSpecies).sort();
                sortedSpecies.forEach(species => {
                    const option = document.createElement('option');
                    option.value = species;
                    option.textContent = species;
                    speciesSelect.appendChild(option);
                });

                const initialState = loadState();
                applyState(initialState);
                window.currentFocusId = initialState.focus;
                activeTechId = initialState.focus;

                if (activeTechId) {
                    navigationHistory = [activeTechId];
                    historyIndex = 0;
                }

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
                    alert(`Link ${focus ? "zum Branch" : ""} kopiert!\n\n${shareURL}`);
                }, (err) => alert("Kopieren fehlgeschlagen: " + err));
            });
        }

        speciesSelect.addEventListener('change', (event) => updateVisualization(event.target.value, activeTechId));
        areaSelect.addEventListener('change', () => updateVisualization(speciesSelect.value, activeTechId));
        layoutSelect.addEventListener('change', () => updateVisualization(speciesSelect.value, activeTechId));
        searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') searchTech(); });
        searchButton.addEventListener('click', searchTech);
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

        ["species-select", "area-select", "layout-select", "search-input", "start-tier-select", "end-tier-select"].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener("change", saveState);
                element.addEventListener("input", saveState);
            }
        });

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
            return getAreaColor(nodeData.area);
        });

        if (selectionStartNode) {
            renderPathButton.style.display = 'inline-block';
            if (selectionEndNode) {
                renderPathButton.textContent = 'Render Path';
            } else {
                renderPathButton.textContent = 'Render Dependencies';
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
        const startTier = parseInt(document.getElementById('start-tier-select').value, 10);
        const endTier = parseInt(document.getElementById('end-tier-select').value, 10);
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

        let baseTechs = allTechs.filter(tech => {
            const areaMatch = selectedArea === 'all' || tech.area === selectedArea;
            const speciesMatch = selectedSpecies === 'all' || !tech.required_species || tech.required_species.length === 0 || tech.required_species.includes(selectedSpecies);
            return areaMatch && speciesMatch;
        });

        let filteredTechs;
        if (activeTechId) {
            const connectedIds = getConnectedTechIds(activeTechId, allTechs);
            filteredTechs = baseTechs.filter(t => connectedIds.has(t.id));
        } else {
            filteredTechs = baseTechs;
        }

        if (tierFilterActive) {
            filteredTechs = filterTechsByTier(filteredTechs);
        }

        updateHistoryButtons();
        techCounter.textContent = `Displayed Technologies: ${filteredTechs.length}`;
        techTreeContainer.innerHTML = '';
        nodes = filteredTechs.map(tech => ({ ...tech }));
        
        const links = [];
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
    }

    function renderForceDirectedGraph(nodes, links, selectedSpecies, container = techTreeContainer) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const zoom = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
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

        const initialScale = Math.min(1.2, 40 / Math.max(1, nodes.length));
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(initialScale).translate(-width/2, -height/2);
        svg.call(zoom.transform, initialTransform);


        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-250))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(80));
        for (let i = 0; i < 50; ++i) simulation.tick();
        const link = g.append('g').attr('stroke', '#e0e0e0ff').attr('stroke-opacity', 0.5).selectAll('line').data(links).join('line');
        const node = g.append('g').selectAll('g').data(nodes).join('g').attr('class', 'tech-node').call(drag(simulation))
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
        node.append('rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 10).attr('ry', 10)
            .attr('fill', d => d.area ? `url(#gradient-${d.area})` : getAreaColor(d.area));
        
        const stripeWidth = 8;
        const cornerRadius = 10;
        const x0 = -nodeWidth / 2;
        const y0 = -nodeHeight / 2;
        const x1 = -nodeWidth / 2 + stripeWidth;
        const y1 = nodeHeight / 2;
        const r = cornerRadius;
        const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;
        node.append('path')
            .attr('d', pathData)
            .attr('fill', d => getTierColor(d.tier));

        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').style('fill', '#ffffff').text(d => d.name ? d.name.substring(0, 18) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `Costs: ${d.cost || 0} - Weight: ${d.weight || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 60).attr('text-anchor', 'middle').style('font-size', '8px').style('fill', '#ffffff').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
        simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }
    
    function renderDisjointForceDirectedGraph(nodes, links, selectedSpecies, container = techTreeContainer) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const zoom = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
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

        const initialScale = Math.min(1.2, 40 / Math.max(1, nodes.length));
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(initialScale).translate(-width/2, -height/2);
        svg.call(zoom.transform, initialTransform);

        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('x', d3.forceX(width / 2).strength(0.1))
            .force('y', d3.forceY(height / 2).strength(0.1))
            .force('collision', d3.forceCollide().radius(60));

        for (let i = 0; i < 150; ++i) simulation.tick();

        const link = g.append('g').attr('stroke', '#999').attr('stroke-opacity', 0.6).selectAll('line').data(links).join('line');
        const node = g.append('g').selectAll('g').data(nodes).join('g').attr('class', 'tech-node').call(drag(simulation))
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
        node.append('rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 8).attr('ry', 8)
            .attr('fill', d => d.area ? `url(#gradient-${d.area})` : getAreaColor(d.area));

        const stripeWidth = 8;
        const cornerRadius = 8;
        const x0 = -nodeWidth / 2;
        const y0 = -nodeHeight / 2;
        const x1 = -nodeWidth / 2 + stripeWidth;
        const y1 = nodeHeight / 2;
        const r = cornerRadius;
        const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;
        node.append('path')
            .attr('d', pathData)
            .attr('fill', d => getTierColor(d.tier));
            
        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').style('fill', '#ffffff').text(d => d.name ? d.name.substring(0, 15) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `Cost: ${d.cost || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 60).attr('text-anchor', 'middle').style('font-size', '8px').style('fill', '#ffffff').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');

        simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
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
        node.append('path')
            .attr('d', pathData)
            .attr('fill', d => getTierColor(d.tier));

        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').style('fill', '#ffffff').text(d => d.name ? d.name.substring(0, 18) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `Costs: ${d.cost || 0} - Weight: ${d.weight || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 60).attr('text-anchor', 'middle').style('font-size', '8px').style('fill', '#ffffff').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');

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

function getTierColor(tier) {
    const tierNum = parseInt(tier, 10) || 0;
    if (tierNum < 0) return '#000000';
    if (tierNum > 11) return '#ffffff';
    const value = Math.round((tierNum / 11) * 255);
    const hex = value.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
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
        const matchedNodes = nodes.filter(n => (n.name && n.name.toLowerCase().includes(searchTerm)) || (n.id && n.id.toLowerCase().includes(searchTerm)));
        if (matchedNodes.length === 0) return;
        techTreeContainer.innerHTML = '';
        const width = techTreeContainer.clientWidth, height = techTreeContainer.clientHeight;
        svg = d3.select(techTreeContainer).append('svg').attr('width', width).attr('height', height);
        g = svg.append("g");
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
        const node = g.selectAll('g').data(searchNodes).join('g').attr('class', 'tech-node')
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
        node.append('path')
            .attr('d', pathData)
            .attr('fill', d => getTierColor(d.tier));
            
        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').style('fill', '#ffffff').text(d => d.name ? d.name.substring(0, 18) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').style('fill', '#ffffff').text(d => `Costs: ${d.cost || 0} - Weight: ${d.weight || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 60).attr('text-anchor', 'middle').style('font-size', '8px').style('fill', '#ffffff').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    function makeDraggable(element) {
        let isDragging = false;
        let offsetX, offsetY;

        element.addEventListener('mousedown', (e) => {
            // Only drag if the click is on the element itself, not its children like buttons or selects
            if (e.target !== element && e.target.closest('button, select, input, a, .tab')) {
                return;
            }
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            element.style.cursor = 'grabbing';
            // Prevent text selection while dragging
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // Constrain movement within the viewport
            const container = document.body;
            const elRect = element.getBoundingClientRect();
            
            newX = Math.max(0, Math.min(newX, container.clientWidth - elRect.width));
            newY = Math.max(0, Math.min(newY, container.clientHeight - elRect.height));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.cursor = 'move';
            document.body.style.userSelect = '';
        });
    }

    // --- Main Execution Logic ---
    const urlParams = new URLSearchParams(window.location.search);
    const pathStart = urlParams.get('pathStart');
    const pathEnd = urlParams.get('pathEnd');
    const dependenciesFor = urlParams.get('dependenciesFor');

    if (pathStart && pathEnd) {
        // If path params are present, initialize the tree and then render the path.
        landingCard.classList.add('hidden');
        treeToolbar.style.display = 'flex';
        techTreeContainer.classList.remove('hidden');
        initializeTree(); // This will fetch the data
        // We need to wait for the data to be loaded before calculating the path.
        // A simple timeout is a pragmatic way to handle this without complex promise chaining.
        setTimeout(() => {
            selectionStartNode = pathStart;
            selectionEndNode = pathEnd;
            calculateAndRenderPath(pathStart, pathEnd);
        }, 1000); // Wait 1 second for data to likely be loaded.
    } else if (dependenciesFor) {
        // If dependenciesFor param is present, initialize the tree and then render the dependencies.
        landingCard.classList.add('hidden');
        treeToolbar.style.display = 'flex';
        techTreeContainer.classList.remove('hidden');
        initializeTree(); // This will fetch the data
        setTimeout(() => {
            selectionStartNode = dependenciesFor;
            calculateAndRenderPath(dependenciesFor);
        }, 1000);
    } else if (urlParams.toString().length > 0) {
        // If there are other URL params, load the tree immediately.
        landingCard.classList.add('hidden');
        treeToolbar.style.display = 'flex';
        techTreeContainer.classList.remove('hidden');
        initializeTree();
        setupEventListeners();
    } else {
        // Otherwise, show the landing card and wait for user interaction.
        treeToolbar.style.display = 'none';
        techTreeContainer.classList.add('hidden');
        landingCard.classList.remove('hidden');

        // These listeners will trigger the tree initialization ONCE.
        const initOnce = { once: true };
        showTreeButton.addEventListener('click', initializeTree, initOnce);
        speciesSelect.addEventListener('mousedown', initializeTree, initOnce);
        areaSelect.addEventListener('mousedown', initializeTree, initOnce);
        searchInput.addEventListener('focus', initializeTree, initOnce);
        layoutSelect.addEventListener('mousedown', initializeTree, initOnce);
        showTierButton.addEventListener('click', initializeTree, initOnce);
        searchButton.addEventListener('click', initializeTree, initOnce);
    }
    
    makeDraggable(sidebar);
});
