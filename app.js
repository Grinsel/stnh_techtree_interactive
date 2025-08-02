document.addEventListener('DOMContentLoaded', () => {
    const speciesSelect = document.getElementById('species-select');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const techTreeContainer = document.getElementById('tech-tree');

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

    speciesSelect.addEventListener('change', (event) => {
        renderTree(event.target.value);
    });

    searchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.toLowerCase();
        if (!searchTerm) return;

        const foundNode = nodes.find(n => n.name.toLowerCase().includes(searchTerm));
        if (foundNode) {
            const width = techTreeContainer.clientWidth;
            const height = techTreeContainer.clientHeight;
            const zoom = d3.zoom().scaleExtent([0.1, 8]);

            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity.translate(width / 2 - foundNode.x, height / 2 - foundNode.y).scale(1.5)
            );
            
            d3.selectAll('.tech-node rect').attr('stroke', d => getAreaColor(d.area));
            d3.select(foundNode.gNode).select('rect').attr('stroke', 'yellow');
        }
    });

    function renderTree(selectedSpecies) {
        const filteredTechs = allTechs.filter(tech => {
            if (selectedSpecies === 'all') return true;
            return (tech.required_species && tech.required_species.length === 0) || (tech.required_species && tech.required_species.includes(selectedSpecies));
        });

        techTreeContainer.innerHTML = '';

        nodes = filteredTechs.map(tech => ({ ...tech }));
        const links = [];
        const nodeIds = new Set(nodes.map(n => n.id));

        filteredTechs.forEach(tech => {
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
            .force('center', d3.forceCenter(width / 2, height / 2));

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
            .call(drag(simulation));
        
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
});
