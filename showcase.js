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

    // --- State Variables ---
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
                updateVisualization(initialState.species, initialState.focus);
            });
    }

    // --- Event Listener Setup ---
    function setupEventListeners() {
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
    }

    // --- Visualization and Helper Functions ---
    function formatTooltip(d) {
        let info = '';
        for (const key in d) {
            if (d.hasOwnProperty(key) && d[key]) {
                info += `<strong>${key}:</strong> ${Array.isArray(d[key]) ? d[key].join(', ') : d[key]}<br>`;
            }
        }
        return info;
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

    function filterTechsByTier(techs) {
        const { startTier, endTier } = getSelectedTierRange();
        return techs.filter(t => {
            const tier = parseInt(t.tier) || 0;
            return tier >= startTier && tier <= endTier;
        });
    }

    window.updateVisualization = function(selectedSpecies, highlightId = null) {
        activeTechId = highlightId;
        const selectedArea = areaSelect.value;
        const selectedLayout = layoutSelect.value;

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
        else if (selectedLayout === 'patent-suits') renderPatentSuitsGraph(nodes, links, selectedSpecies);
    }

    function renderForceDirectedGraph(nodes, links, selectedSpecies) {
        const width = techTreeContainer.clientWidth;
        const height = techTreeContainer.clientHeight;
        const zoom = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
        svg = d3.select(techTreeContainer).append('svg').attr('width', width).attr('height', height).call(zoom);
        g = svg.append("g");
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(200))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(80));
        for (let i = 0; i < 200; ++i) simulation.tick();
        const link = g.append('g').attr('stroke', '#999').attr('stroke-opacity', 0.6).selectAll('line').data(links).join('line');
        const node = g.append('g').selectAll('g').data(nodes).join('g').attr('class', 'tech-node').call(drag(simulation))
            .on('mouseover', (event, d) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', (event) => {
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY + 15) + 'px';
            })
            .on('mouseout', () => tooltip.style.display = 'none')
            .on('click', (event, d) => {
                window.currentFocusId = d.id;
                updateVisualization(selectedSpecies, d.id);
            });
        const nodeWidth = 140, nodeHeight = 80;
        node.append('rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 10).attr('ry', 10).attr('stroke', d => getAreaColor(d.area));
        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').text(d => d.name ? d.name.substring(0, 18) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').text(d => `Costs: ${d.cost || 0} - Weight: ${d.weight || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 60).attr('text-anchor', 'middle').style('font-size', '8px').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
        simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }
    
    function renderDisjointForceDirectedGraph(nodes, links, selectedSpecies) { /* Implementation omitted for brevity, same as original */ }
    function renderPatentSuitsGraph(nodes, links, selectedSpecies) { /* Implementation omitted for brevity, same as original */ }

    function getAreaColor(area) {
        switch (area) {
            case 'physics': return '#2a7fff';
            case 'society': return '#00a000';
            case 'engineering': return '#ff8000';
            default: return '#808080';
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
        const matchedNodes = nodes.filter(n => (n.name && n.name.toLowerCase().includes(searchTerm)) || (n.id && n.id.toLowerCase().includes(searchTerm)));
        if (matchedNodes.length === 0) return;
        techTreeContainer.innerHTML = '';
        const width = techTreeContainer.clientWidth, height = techTreeContainer.clientHeight;
        svg = d3.select(techTreeContainer).append('svg').attr('width', width).attr('height', height);
        g = svg.append("g");
        const searchNodes = matchedNodes.map(tech => ({ ...tech }));
        const nodeWidth = 140, nodeHeight = 80, paddingX = 30, paddingY = 30;
        const cols = Math.max(1, Math.floor(width / (nodeWidth + paddingX)));
        searchNodes.forEach((d, i) => {
            d.x = paddingX + (i % cols) * (nodeWidth + paddingX) + nodeWidth / 2;
            d.y = paddingY + Math.floor(i / cols) * (nodeHeight + paddingY) + nodeHeight / 2;
        });
        const node = g.selectAll('g').data(searchNodes).join('g').attr('class', 'tech-node')
            .on('mouseover', (event, d) => {
                tooltip.style.display = 'block';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', (event) => {
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY + 15) + 'px';
            })
            .on('mouseout', () => tooltip.style.display = 'none')
            .on('click', (event, d) => {
                window.currentFocusId = d.id;
                searchInput.value = '';
                updateVisualization(speciesSelect.value, d.id);
            });
        node.append('rect').attr('width', nodeWidth).attr('height', nodeHeight).attr('x', -nodeWidth / 2).attr('y', -nodeHeight / 2).attr('rx', 10).attr('ry', 10).attr('stroke', 'yellow');
        node.append('text').attr('y', -nodeHeight / 2 + 15).attr('text-anchor', 'middle').style('font-weight', 'bold').text(d => d.name ? d.name.substring(0, 18) : d.id);
        node.append('text').attr('y', -nodeHeight / 2 + 30).attr('text-anchor', 'middle').text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 45).attr('text-anchor', 'middle').text(d => `Costs: ${d.cost || 0} - Weight: ${d.weight || 0}`);
        node.append('text').attr('y', -nodeHeight / 2 + 60).attr('text-anchor', 'middle').style('font-size', '8px').text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    // --- Main Execution Logic ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.toString().length > 0) {
        // If there are URL params, load the tree immediately.
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
});
