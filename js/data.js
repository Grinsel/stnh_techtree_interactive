// Data module: prepares and caches data for rendering.
// UI-agnostic: no DOM or d3 usage here.

// --- In-memory caches ---
let _techs = null;            // Array<Tech>
let _species = null;          // Array<string>
let _indexById = null;        // Map<string, Tech>

// --- Types (informal) ---
// Tech: {
//   id: string,
//   name?: string,
//   area?: string, // 'physics' | 'society' | 'engineering' | ...
//   tier?: number|string,
//   prerequisites?: string[],
//   required_species?: string[]
// }

// --- Loaders ---
export async function loadTechnologyData() {
  if (Array.isArray(_techs)) return _techs;
  const res = await fetch('assets/technology.json');
  const data = await res.json();
  // Normalize
  _techs = (data || []).map(t => ({
    ...t,
    prerequisites: Array.isArray(t.prerequisites) ? t.prerequisites : [],
    required_species: Array.isArray(t.required_species) ? t.required_species : [],
  }));
  _indexById = null; // reset index
  return _techs;
}

export async function loadSpeciesList() {
  if (Array.isArray(_species)) return _species;
  const res = await fetch('assets/species.json');
  _species = await res.json();
  return _species;
}

export async function initData() {
  // Best-effort parallel preload
  await Promise.all([loadTechnologyData(), loadSpeciesList()]);
  return { techs: _techs, species: _species };
}

// --- Convenience wrappers for consumers ---

export function isTechDataLoaded() {
  return Array.isArray(_techs);
}

// --- Indexing ---
export function indexTechs(techs) {
  const map = new Map();
  for (const t of techs) map.set(t.id, t);
  return map;
}

function ensureIndex(techs) {
  if (!_indexById) _indexById = indexTechs(techs || _techs || []);
  return _indexById;
}

// --- Graph utilities ---
export function buildLinksFromPrereqs(techs) {
  const links = [];
  const ids = new Set((techs || []).map(t => t.id));
  for (const t of techs || []) {
    const prereqs = Array.isArray(t.prerequisites) ? t.prerequisites : [];
    for (const p of prereqs) {
      if (ids.has(p)) links.push({ source: p, target: t.id });
    }
  }
  return links;
}

export function getConnectedTechIds(startId, techs) {
  const list = techs || _techs || [];
  const connected = new Set();
  function findAncestors(id) {
    const node = list.find(t => t.id === id);
    if (node && node.prerequisites) {
      node.prerequisites.forEach(prereq => {
        if (!connected.has(prereq)) { connected.add(prereq); findAncestors(prereq); }
      });
    }
  }
  function findDescendants(id) {
    list.forEach(t => {
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

export function getPrerequisites(startId, techs) {
  const list = techs || _techs || [];
  const prerequisites = new Set();
  const techMap = new Map(list.map(t => [t.id, t]));
  (function findAncestors(id) {
    if (prerequisites.has(id)) return;
    prerequisites.add(id);
    const node = techMap.get(id);
    if (node && node.prerequisites) node.prerequisites.forEach(findAncestors);
  })(startId);
  return prerequisites;
}

export function calculatePath(startId, endId, techs) {
  const list = techs || _techs || [];
  const techMap = new Map(list.map(t => [t.id, t]));
  const adj = new Map();
  list.forEach(t => {
    (t.prerequisites || []).forEach(p => {
      if (!adj.has(p)) adj.set(p, []);
      adj.get(p).push(t.id);
    });
  });

  // Bidirectional BFS across ancestors/descendants
  let qF = [startId], qB = [endId];
  let visitedF = new Map([[startId, [startId]]]), visitedB = new Map([[endId, [endId]]]);
  let path = [];

  while (qF.length > 0 && qB.length > 0) {
    // Forward step
    let currF = qF.shift();
    if (visitedB.has(currF)) { path = visitedF.get(currF).concat(visitedB.get(currF).reverse().slice(1)); break; }
    // Descendants
    if (adj.has(currF)) {
      for (const n of adj.get(currF)) if (!visitedF.has(n)) { visitedF.set(n, [...visitedF.get(currF), n]); qF.push(n); }
    }
    // Ancestors
    const techF = techMap.get(currF);
    if (techF && techF.prerequisites) {
      for (const n of techF.prerequisites) if (!visitedF.has(n)) { visitedF.set(n, [...visitedF.get(currF), n]); qF.push(n); }
    }

    // Backward step
    let currB = qB.shift();
    if (visitedF.has(currB)) { path = visitedF.get(currB).concat(visitedB.get(currB).reverse().slice(1)); break; }
    // Ancestors
    const techB = techMap.get(currB);
    if (techB && techB.prerequisites) {
      for (const n of techB.prerequisites) if (!visitedB.has(n)) { visitedB.set(n, [...visitedB.get(currB), n]); qB.push(n); }
    }
    // Descendants
    if (adj.has(currB)) {
      for (const n of adj.get(currB)) if (!visitedB.has(n)) { visitedB.set(n, [...visitedB.get(currB), n]); qB.push(n); }
    }
  }

  const pathNodeIds = new Set(path);
  const pathNodes = list.filter(t => pathNodeIds.has(t.id));
  const pathLinks = [];
  pathNodes.forEach(t => {
    (t.prerequisites || []).forEach(p => { if (pathNodeIds.has(p)) pathLinks.push({ source: p, target: t.id }); });
  });
  return { nodes: pathNodes, links: pathLinks };
}




// --- Getters (optional external use) ---
export function getAllTechsCached() { return _techs; }
export function getAllSpeciesCached() { return _species; }
