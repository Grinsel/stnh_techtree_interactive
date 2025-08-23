// UI Search module: renders search results grid and wires interactions
// Depends on render utilities and data search helper. No global state.

import { createSvgFor, renderStraightLinks, renderNodeBase, renderTierIndicator, renderNodeLabels, formatTooltip } from './render.js';
import { zoomToFit } from './ui/zoom.js';

export function runSearch({
  searchTerm,
  searchAll = false,
  allTechs = [],
  currentNodes = [],
  currentLinks = [],
  techTreeContainer,
  tooltipEl,
  searchBackButtonEl,
  speciesSelectEl,
  updateVisualization,
  simulation,
  layoutAsGrid,
  zoomToTech,
}) {
  const term = (searchTerm || '').trim();
  if (!term) return null;

  const scope = searchAll ? allTechs : currentNodes;
  const matchedNodes = findMatchingTechs(scope, term);

  if (matchedNodes.length === 1) {
    const singleResult = matchedNodes[0];
    const isAlreadyVisible = currentNodes.some(node => node.id === singleResult.id);

    if (isAlreadyVisible) {
      // Tech is already on screen. Activate it and zoom.
      if (typeof window.setActiveTech === 'function') {
        window.setActiveTech(singleResult.id);
      }
      if (typeof zoomToTech === 'function') {
        zoomToTech(singleResult.id);
      }
    } else {
      // Tech is not visible. Load its branch and then zoom via callback.
      if (typeof updateVisualization === 'function') {
        // The 4th argument is the new zoomOnEndId
        updateVisualization(speciesSelectEl.value, singleResult.id, true, singleResult.id);
      }
    }
    return null; // Prevent the search grid from rendering
  }
  if (!matchedNodes || matchedNodes.length === 0) {
    alert('No results in the current view. Enable Search all techs to search the entire tree.');
    return null;
  }

  try { if (simulation) simulation.stop(); } catch (e) {}

  if (searchBackButtonEl) searchBackButtonEl.style.display = 'block';
  // Preserve glossary inside #tech-tree; only remove previous SVGs
  techTreeContainer.querySelectorAll('svg').forEach(el => el.remove());
  const created = createSvgFor(techTreeContainer);
  const width = created.width, height = created.height, zoom = created.zoom;

  // Local svg/g returned to caller to update their globals
  const svg = created.svg;
  const g = created.g;

  const searchNodes = matchedNodes.map(tech => ({ ...tech }));
  const nodeWidth = 140, nodeHeight = 80;
  layoutAsGrid(searchNodes, width, { nodeWidth, nodeHeight }, { padX: 30, padY: 30 });

  // Build a map for quick id -> node lookup
  const idToNode = new Map(searchNodes.map(n => [n.id, n]));
  // Compute links where both ends are in the result set
  const searchLinks = [];
  searchNodes.forEach(tech => {
    (tech.prerequisites || []).forEach(pr => {
      if (idToNode.has(pr)) searchLinks.push({ source: idToNode.get(pr), target: tech });
    });
  });

  try { console.log(`[runSearch] matches: ${searchNodes.length}, links: ${searchLinks.length}, scopeAll: ${!!searchAll}`); } catch (e) {}

  // Expose data on group and mark layout to keep LOD from interfering (legacy compatibility)
  g.property('layout','search').datum({ nodes: searchNodes, links: searchLinks });

  // Draw links first
  renderStraightLinks(g.select('.links-layer'), searchLinks);

  const node = g.select('.nodes-layer').selectAll('g')
    .data(searchNodes)
    .join('g')
    .attr('class', 'tech-node')
    .on('mouseover', (event, d) => {
      if (!tooltipEl) return;
      tooltipEl.style.display = 'block';
      tooltipEl.innerHTML = formatTooltip(d);
    })
    .on('mousemove', (event) => {
      if (!tooltipEl) return;
      const treeRect = techTreeContainer.getBoundingClientRect();
      const tooltipRect = tooltipEl.getBoundingClientRect();
      let x = event.clientX + 15;
      let y = event.clientY + 15;
      if (x + tooltipRect.width > treeRect.right) x = event.clientX - tooltipRect.width - 15;
      if (y + tooltipRect.height > treeRect.bottom) y = event.clientY - tooltipRect.height - 15;
      tooltipEl.style.left = `${Math.max(treeRect.left, x)}px`;
      tooltipEl.style.top = `${Math.max(treeRect.top, y)}px`;
    })
    .on('mouseout', () => { if (tooltipEl) tooltipEl.style.display = 'none'; })
    .on('click', (event, d) => {
      if (typeof updateVisualization === 'function' && speciesSelectEl) {
        updateVisualization(speciesSelectEl.value, d.id, true);
      }
    });

  renderNodeBase(node, { nodeWidth, nodeHeight });
  renderTierIndicator(node, { nodeWidth, nodeHeight, stripeWidth: 8 });
  renderNodeLabels(node, { nodeWidth, nodeHeight });
  node.attr('transform', d => `translate(${d.x},${d.y})`);

  // Center and zoom the viewport on the matched nodes
  zoomToFit(created.svg, created.g, zoom, searchNodes, width, height);

  return { svg, g, nodes: searchNodes, links: searchLinks };
}

// --- Search ---
export function findMatchingTechs(techs, term) {
  const q = (term || '').trim().toLowerCase();
  if (!q) return [];
  return (techs || []).filter(n => (n.name && n.name.toLowerCase().includes(q)) || (n.id && n.id.toLowerCase().includes(q)));
}

// High-level search executor to be called from UI code
// Params mirror runSearch but are explicit to decouple UI modules
export function handleSearch({
  searchTerm,
  searchAll,
  allTechs,
  currentNodes,
  currentLinks,
  techTreeContainer,
  tooltipEl,
  searchBackButtonEl,
  speciesSelectEl,
  updateVisualization,
  simulation,
  layoutAsGrid,
  zoomToTech,
}) {
  const term = (searchTerm || '').trim();
  if (!term) return null;
  return runSearch({
    searchTerm: term,
    searchAll: !!searchAll,
    allTechs,
    currentNodes,
    currentLinks,
    techTreeContainer,
    tooltipEl,
    searchBackButtonEl,
    speciesSelectEl,
    updateVisualization,
    simulation,
    layoutAsGrid,
    zoomToTech,
  });
}
