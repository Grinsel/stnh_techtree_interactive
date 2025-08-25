// Render module: shared rendering helpers
// TODO: migrate renderStraightLinks, renderNodeBase, renderTierIndicator, renderNodeLabels, tooltip helpers, wrapText

export function createSvgFor(container, onZoom) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
  const g = svg.append("g");
  g.append('g').attr('class','links-layer');
  g.append('g').attr('class','nodes-layer');
  const zoom = d3.zoom().on("zoom", (event) => {
    g.attr("transform", event.transform);
    if (typeof onZoom === 'function') onZoom(event);
  });
  svg.call(zoom);
  return { svg, g, zoom, width, height };
}

 

// --- Shared Rendering Utilities ---
export function renderStraightLinks(layer, links) {
  layer.selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', '#e0e0e0ff')
      .attr('stroke-opacity', 0.5)
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
}

export function getAreaColor(area) {
  switch (area) {
    case 'physics': return '#2a7fff';
    case 'society': return '#36d673';
    case 'engineering': return '#ffb400';
    default: return '#666666';
  }
}

export function renderNodeBase(nodeSel, { nodeWidth, nodeHeight }) {
  nodeSel.append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', d => getAreaColor(d.area));
}

export function renderTierIndicator(nodeSel, { nodeWidth, nodeHeight, stripeWidth = 8 }) {
  const cornerRadius = 10;
  const x0 = -nodeWidth / 2;
  const y0 = -nodeHeight / 2;
  const x1 = -nodeWidth / 2 + stripeWidth;
  const y1 = nodeHeight / 2;
  const r = cornerRadius;
  const pathData = `M ${x0},${y0 + r} A ${r},${r} 0 0 1 ${x0 + r},${y0} L ${x1},${y0} L ${x1},${y1} L ${x0 + r},${y1} A ${r},${r} 0 0 1 ${x0},${y1 - r} Z`;

  const tierIndicator = nodeSel.append('g');
  tierIndicator.append('path').attr('d', pathData).attr('fill', 'white');

  tierIndicator.each(function(d) {
      const tier = parseInt(d.tier) || 0;
      if (tier > 0) {
          const gSel = d3.select(this);
          const clipId = `clip-${d.id.replace(/[^a-zA-Z0-9-_]/g, '_')}`;

          gSel.append('defs')
            .append('clipPath')
            .attr('id', clipId)
            .append('path')
            .attr('d', pathData);

          const stripes = gSel.append('g').attr('clip-path', `url(#${clipId})`);
          const stripeSpacing = 6;
          const strokeW = 2;
          for (let i = 0; i < Math.min(tier, 11); i++) {
              const y = y0 + 3 + i * stripeSpacing;
              stripes.append('line')
                  .attr('stroke', 'black')
                  .attr('stroke-width', strokeW)
                  .attr('x1', x0 - 5)
                  .attr('y1', y)
                  .attr('x2', x1 + 5)
                  .attr('y2', y + (x1 - x0) + 6);
          }
      }
  });
}

// Unified render dispatcher moved from ui/renderDispatcher.js
// Usage: renderGraph(layout, nodes, links, selectedSpecies, container, deps)
export function renderGraph(layout, nodes, links, selectedSpecies, container, deps) {
  if (layout === 'force-directed') {
    return deps.forceLayout(nodes, links, selectedSpecies, container, deps);
  } else if (layout === 'disjoint-force-directed') {
    return deps.disjointLayout(nodes, links, selectedSpecies, container, deps);
  } else if (layout === 'force-directed-arrows') {
    return deps.arrowsLayout(nodes, links, selectedSpecies, container, deps);
  }
  // Fallback to force layout
  return deps.forceLayout(nodes, links, selectedSpecies, container, deps);
}

// Helper to wrap SVG text into tspans up to a max number of lines
export function wrapText(textSelection, width, lineHeight = 12, maxLines = 2) {
  textSelection.each(function(d) {
      const text = d3.select(this);
      const full = text.text() || '';
      const words = full.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
          d._nameLineCount = 0;
          return;
      }
      let line = [];
      let lineNumber = 0;
      const x = +((text.attr('x') ?? 0));
      const y = +((text.attr('y') ?? 0));
      text.text(null);
      let tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', 0);
      for (let i = 0; i < words.length; i++) {
          const word = words[i];
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(' '));
              line = [word];
              lineNumber += 1;
              if (lineNumber >= maxLines) {
                  const last = text.select('tspan:last-child');
                  const current = last.text();
                  let trimmed = current;
                  last.text(trimmed + '…');
                  while (last.node().getComputedTextLength() > width && trimmed.length > 0) {
                      trimmed = trimmed.slice(0, -1);
                      last.text(trimmed + '…');
                  }
                  d._nameLineCount = maxLines;
                  return;
              }
              tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', lineNumber * lineHeight).text(word);
          }
      }
      d._nameLineCount = lineNumber + 1;
  });
}

export function renderNodeLabels(nodeSel, { nodeWidth, nodeHeight }) {
  const nodeTextWidth = nodeWidth - 8 /*wedge*/ - 16 /*padding*/;
  const nameText = nodeSel.append('text')
      .attr('class', 'node-label node-name')
      .attr('x', 0)
      .attr('y', -nodeHeight / 2 + 14)
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .style('fill', '#ffffff')
      .text(d => d.name || d.id);
  wrapText(nameText, nodeTextWidth, 12, 2);

  nodeSel.append('text')
      .attr('class', 'node-label node-category')
      .attr('x', 0)
      .attr('y', d => {
          const lines = d && d._nameLineCount ? d._nameLineCount : 1;
          return -nodeHeight / 2 + 30 + (lines - 1) * 12;
      })
      .attr('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .text(d => `${d.category || 'N/A'}`);

  nodeSel.append('text')
      .attr('class', 'node-label node-species')
      .attr('x', 0)
      .attr('y', d => {
          const lines = d && d._nameLineCount ? d._nameLineCount : 1;
          return -nodeHeight / 2 + 45 + (lines - 1) * 12;
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '8px')
      .style('fill', '#ffffff')
      .text(d => (d.required_species && d.required_species.length > 0) ? d.required_species.join(', ') : 'Global');
}

import { getAllTechsCached } from './data.js';

export function formatTooltip(d) {
    const techSource = getAllTechsCached() || [];
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

// Shared Level-of-Detail logic used by layouts and the legacy showcase
export function updateLOD(svg, g) {
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
      const nodeWidth = (layout === 'disjoint-force-directed') ? 120 : 140;
      const textWidth = nodeWidth - 8 /*wedge*/ - 16 /*padding*/;

      const nameSel = nodesSel.append('text')
        .attr('class', 'node-label node-name')
        .attr('x', 0)
        .attr('y', -nodeHeight / 2 + 14)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', '#ffffff')
        .text(d => d.name || d.id);
      wrapText(nameSel, textWidth, 12, 2);

      const categorySel = nodesSel.append('text')
        .attr('class', 'node-label node-category')
        .attr('x', 0)
        .attr('y', d => {
          const lines = d && d._nameLineCount ? d._nameLineCount : 1;
          return -nodeHeight / 2 + 30 + (lines - 1) * 12;
        })
        .attr('text-anchor', 'middle')
        .style('fill', '#ffffff')
        .text(d => `${d.category || 'N/A'}`);

      nodesSel.append('text')
        .attr('class', 'node-label node-species')
        .attr('x', 0)
        .attr('y', d => {
          const lines = d && d._nameLineCount ? d._nameLineCount : 1;
          return -nodeHeight / 2 + (nodeHeight === 70 ? 45 : 50) + (lines - 1) * 12;
        })
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
          const stripeSpacing = 6; // fixed spacing to fit up to 11 tiers
          const strokeW = 2; // fixed stroke width for clarity
          for (let i = 0; i < Math.min(tier, 11); i++) {
            const y = y0t + 3 + i * stripeSpacing; // small top padding
            stripes.append('line')
              .attr('stroke', 'black')
              .attr('stroke-width', strokeW)
              .attr('x1', x0t - 5)
              .attr('y1', y)
              .attr('x2', x1t + 5)
              .attr('y2', y + (x1t - x0t) + 6);
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

    // Show everything for small graphs or when LOD is disabled
    g.selectAll('.node-label').style('display', null);
    g.selectAll('.tier-indicator').style('display', null);
    g.selectAll('.link').style('display', null);
    // Ensure we revert to rectangle view and hide circle glyphs when not using LOD
    g.selectAll('.node-circle').style('display', 'none');
    g.selectAll('.node-rect').style('display', null);
    return;
  }

  // Initialize labels once when zoom passes threshold
  if (!flags.labels && k >= showLabelsAt && !nodesSel.empty()) {
    const nodeHeight = (layout === 'disjoint-force-directed') ? 70 : 80;
    const nodeWidth = (layout === 'disjoint-force-directed') ? 120 : 140;
    const textWidth = nodeWidth - 8 /*wedge*/ - 16 /*padding*/;

    const nameSel2 = nodesSel.append('text')
      .attr('class', 'node-label node-name')
      .attr('x', 0)
      .attr('y', -nodeHeight / 2 + 14)
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .style('fill', '#ffffff')
      .text(d => d.name || d.id);
    wrapText(nameSel2, textWidth, 12, 2);

    nodesSel.append('text')
      .attr('class', 'node-label node-category')
      .attr('x', 0)
      .attr('y', d => {
        const lines = d && d._nameLineCount ? d._nameLineCount : 1;
        return -nodeHeight / 2 + 30 + (lines - 1) * 12;
      })
      .attr('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .text(d => `${d.category || 'N/A'}`);

    nodesSel.append('text')
      .attr('class', 'node-label node-species')
      .attr('x', 0)
      .attr('y', d => {
        const lines = d && d._nameLineCount ? d._nameLineCount : 1;
        return -nodeHeight / 2 + (nodeHeight === 70 ? 55 : 60) + (lines - 1) * 12;
      })
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
    const x0b = -nodeWidth / 2;
    const y0b = -nodeHeight / 2;
    const x1b = -nodeWidth / 2 + stripeWidth;
    const y1b = nodeHeight / 2;
    const rb = cornerRadius;
    const pathData = `M ${x0b},${y0b + rb} A ${rb},${rb} 0 0 1 ${x0b + rb},${y0b} L ${x1b},${y0b} L ${x1b},${y1b} L ${x0b + rb},${y1b} A ${rb},${rb} 0 0 1 ${x0b},${y1b - rb} Z`;

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
        const stripeSpacing = 6; // fixed spacing to fit up to 11 tiers
        const strokeW = 2; // fixed stroke width for clarity
        for (let i = 0; i < Math.min(tier, 11); i++) {
          const y = y0b + 3 + i * stripeSpacing; // small top padding
          stripes.append('line')
            .attr('stroke', 'black')
            .attr('stroke-width', strokeW)
            .attr('x1', x0b - 5)
            .attr('y1', y)
            .attr('x2', x1b + 5)
            .attr('y2', y + (x1b - x0b) + 6);
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

export function calculateAndRenderPath(startId, endId, allTechs, deps) {
  const {
    popupViewportEl,
    popupContainerEl,
    tooltipEl,
    techTreeContainerEl,
    renderPopupGraph,
    getPrerequisitesData,
    calculatePathData,
  } = deps;

  const placeholderEl = document.getElementById('popup-placeholder');
  let pathNodes, pathLinks;

  // Always clear previous graph rendering
  if (popupContainerEl) {
    const svg = popupContainerEl.querySelector('svg');
    if (svg) svg.remove();
  }
  
  if (endId) {
    const result = calculatePathData(startId, endId, allTechs);
    pathNodes = result.nodes;
    pathLinks = result.links;
    const startNode = allTechs.find(t => t.id === startId);
    const endNode = allTechs.find(t => t.id === endId);
    if (placeholderEl) {
      placeholderEl.innerHTML = `Path between ${startNode?.name || startId} and ${endNode?.name || endId}`;
    }
  } else {
    const pathNodeIds = getPrerequisitesData(startId, allTechs);
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
    const startNode = allTechs.find(t => t.id === startId);
    if (placeholderEl) {
      placeholderEl.innerHTML = `Minimum requirement for ${startNode?.name || startId}`;
    }
  }

  if (popupViewportEl) popupViewportEl.classList.remove('hidden');

  if (pathNodes.length === 0) {
    if (placeholderEl) placeholderEl.innerHTML = 'No path or prerequisites found.';
    return;
  }

  renderPopupGraph(pathNodes, pathLinks, {
    containerEl: popupContainerEl,
    tooltipEl,
    techTreeContainerEl,
    drag: deps.drag,
  });
}
