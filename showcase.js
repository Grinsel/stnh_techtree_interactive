document.addEventListener('DOMContentLoaded', () => {
    const speciesSelect = document.getElementById('species-select');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const techTreeContainer = document.getElementById('tech-tree');
    const tooltip = document.getElementById('tooltip');
    const areaSelect = document.getElementById('area-select');
    const resetButton = document.getElementById('reset-button');
    let activeTechId = null;

    // Hilfsfunktion: Tooltip-Inhalt generieren
    function formatTooltip(d) {
        let info = '';
        for (const key in d) {
            if (d.hasOwnProperty(key)) {
                info += `<strong>${key}:</strong> ${Array.isArray(d[key]) ? d[key].join(', ') : d[key]}<br>`;
            }
        }
        return info;
    }

    let allTechs = [];
    let allSpecies = new Set();
    let nodes = [];
    let simulation, svg, g;

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

            renderTree('all');
        });

    // Hilfsfunktion: Finde alle verbundenen Techs (rekursiv, ancestors + descendants)
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

    let currentSpecies = 'all';

    function renderTree(selectedSpecies, newActiveTechId = null) {
        // Merke den aktuellen Filter und die Aktivierung
        activeTechId = newActiveTechId;

        const selectedArea = areaSelect ? areaSelect.value : 'all';

        const filteredTechs = allTechs.filter(tech => {
            let areaMatch = selectedArea === 'all' || tech.area === selectedArea;
            let speciesMatch = selectedSpecies === 'all' ||
                (tech.required_species && tech.required_species.length === 0) ||
                (tech.required_species && tech.required_species.includes(selectedSpecies));
            return areaMatch && speciesMatch;
        });

        techTreeContainer.innerHTML = '';

        let displayTechs = filteredTechs;
        if (activeTechId) {
            const connectedIds = getConnectedTechIds(activeTechId, filteredTechs);
            displayTechs = filteredTechs.filter(t => connectedIds.has(t.id));
        }

        nodes = displayTechs.map(tech => ({ ...tech }));
        const links = [];
        const nodeIds = new Set(nodes.map(n => n.id));

        displayTechs.forEach(tech => {
            if (tech.prerequisites) {
                tech.prerequisites.forEach(prereq => {
                    if (nodeIds.has(prereq)) {
                        links.push({ source: prereq, target: tech.id });
                    }
                });
            }
        });

        const width = techTreeContainer.clientWidth;
        const height = techTreeContainer.clientHeight;

        const zoom = d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

        svg = d3.select(techTreeContainer).append('svg')
            .attr('width', width)
            .attr('height', height)
            .call(zoom);
        
        g = svg.append("g");

        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(200))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(80));

        const link = g.append('g')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .selectAll('line')
            .data(links)
            .join('line');

        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .attr('class', 'tech-node')
            .call(drag(simulation))
            .on('mouseover', function(event, d) {
                tooltip.style.display = 'block';
                // Nutze clientX/clientY für korrekte Position relativ zum Fenster
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY + 15) + 'px';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', function(event) {
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY + 15) + 'px';
            })
            .on('mouseout', function() {
                tooltip.style.display = 'none';
            })
            .on('click', function(event, d) {
                // Bei Klick: Nur verbundene Techs anzeigen und zentrieren
                renderTree(selectedSpecies, d.id);
                setTimeout(() => {
                    // Zentriere die aktive Tech
                    const found = nodes.find(n => n.id === d.id);
                    if (found && found.x !== undefined && found.y !== undefined) {
                        const zoom = d3.zoom().scaleExtent([0.1, 8]);
                        svg.transition().duration(750).call(
                            zoom.transform,
                            d3.zoomIdentity.translate(width / 2 - found.x, height / 2 - found.y).scale(1.5)
                        );
                    }
                }, 500);
            });

        node.each(function(d) { d.gNode = this; });

        const nodeWidth = 140;
        const nodeHeight = 80;

        node.append('rect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('x', -nodeWidth / 2)
            .attr('y', -nodeHeight / 2)
            .attr('rx', 10)
            .attr('ry', 10)
            .attr('stroke', d => getAreaColor(d.area));

        node.append('text')
            .attr('y', -nodeHeight / 2 + 15)
            .attr('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .text(d => d.name ? d.name.substring(0, 18) : d.id);

        node.append('text')
            .attr('y', -nodeHeight / 2 + 30)
            .attr('text-anchor', 'middle')
            .text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);

        node.append('text')
            .attr('y', -nodeHeight / 2 + 45)
            .attr('text-anchor', 'middle')
            .text(d => `Costs: ${d.cost || 0} - Weight: ${d.weight || 0}`);
            
        node.append('text')
            .attr('y', -nodeHeight / 2 + 60)
            .attr('text-anchor', 'middle')
            .style('font-size', '8px')
            .text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        svg.on('dblclick', function(event) {
            // Nur Hintergrund (SVG) doppelklicken, nicht auf Knoten
            if (event.target === svg.node()) {
                renderTree(speciesSelect.value, null);
            }
        });
    }

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
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    speciesSelect.addEventListener('change', (event) => {
        renderTree(event.target.value, activeTechId);
    });

    if (areaSelect) {
        areaSelect.addEventListener('change', () => {
            renderTree(speciesSelect.value, activeTechId);
        });
    }

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            searchTech();
        }
    });
    searchButton.addEventListener('click', searchTech);

    function searchTech() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) return;

        // Finde alle passenden Techs (case-insensitive)
        const matchedNodes = nodes.filter(n =>
            (n.name && n.name.toLowerCase().includes(searchTerm)) ||
            (n.id && n.id.toLowerCase().includes(searchTerm))
        );

        if (matchedNodes.length === 0) return;

        techTreeContainer.innerHTML = '';
        const width = techTreeContainer.clientWidth;
        const height = techTreeContainer.clientHeight;

        const zoom = d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

        svg = d3.select(techTreeContainer).append('svg')
            .attr('width', width)
            .attr('height', height)
            .call(zoom);

        g = svg.append("g");

        // Raster-Layout für Suchergebnisse
        const searchNodes = matchedNodes.map(tech => ({ ...tech }));
        const nodeWidth = 140;
        const nodeHeight = 80;
        const paddingX = 30;
        const paddingY = 30;
        const cols = Math.max(1, Math.floor(width / (nodeWidth + paddingX)));
        searchNodes.forEach((d, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            d.x = paddingX + col * (nodeWidth + paddingX) + nodeWidth / 2;
            d.y = paddingY + row * (nodeHeight + paddingY) + nodeHeight / 2;
        });

        const node = g.selectAll('g')
            .data(searchNodes)
            .join('g')
            .attr('class', 'tech-node')
            .call(drag(simulation))
            .on('mouseover', function(event, d) {
                tooltip.style.display = 'block';
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY + 15) + 'px';
                tooltip.innerHTML = formatTooltip(d);
            })
            .on('mousemove', function(event) {
                tooltip.style.left = (event.clientX + 15) + 'px';
                tooltip.style.top = (event.clientY + 15) + 'px';
            })
            .on('mouseout', function() {
                tooltip.style.display = 'none';
            })
            .on('click', function(event, d) {
                searchInput.value = '';
                renderTree(speciesSelect.value, d.id);
            });

        node.each(function(d) { d.gNode = this; });

        node.append('rect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('x', -nodeWidth / 2)
            .attr('y', -nodeHeight / 2)
            .attr('rx', 10)
            .attr('ry', 10)
            .attr('stroke', 'yellow');

        node.append('text')
            .attr('y', -nodeHeight / 2 + 15)
            .attr('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .text(d => d.name ? d.name.substring(0, 18) : d.id);

        node.append('text')
            .attr('y', -nodeHeight / 2 + 30)
            .attr('text-anchor', 'middle')
            .text(d => `${d.area || 'N/A'} - T${d.tier || 0}`);

        node.append('text')
            .attr('y', -nodeHeight / 2 + 45)
            .attr('text-anchor', 'middle')
            .text(d => `Costs: ${d.cost || 0} - Weight: ${d.weight || 0}`);

        node.append('text')
            .attr('y', -nodeHeight / 2 + 60)
            .attr('text-anchor', 'middle')
            .style('font-size', '8px')
            .text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');

        // Setze die Positionen direkt (kein Force-Layout)
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    resetButton.addEventListener('click', () => {
        renderTree(speciesSelect.value, null);
    });
});
