// Filters module: pure data utilities for filtering tech arrays
import { getConnectedTechIds } from './data.js';

export function filterTechsByArea(techs, area) {
  if (!area || area === 'all') return techs;
  return (techs || []).filter(t => t.area === area);
}

export function filterTechsBySpecies(techs, species, isExclusive = false) {
  if (!species || species === 'all') return techs;
  return (techs || []).filter(t => {
    const rs = t.required_species || [];
    return isExclusive ? (rs.length > 0 && rs.includes(species)) : (rs.length === 0 || rs.includes(species));
  });
}

export function filterTechsByTier(techs, { startTier = 0, endTier = 99 } = {}) {
  return (techs || []).filter(t => {
    const tier = parseInt(t.tier, 10) || 0;
    return tier >= startTier && tier <= endTier;
  });
}

export function filterConnected(techs, activeTechId) {
  if (!activeTechId) return techs;
  const connected = getConnectedTechIds(activeTechId, techs);
  const set = new Set(connected);
  return (techs || []).filter(t => set.has(t.id));
}

export function filterTechsByCategory(techs, category) {
  if (!category || category === 'all') return techs;
  return (techs || []).filter(t => Array.isArray(t.category) && t.category.includes(category));
}

export function filterTechs({ techs, species = 'all', isExclusive = false, area = 'all', category = 'all', tierRange = { startTier: 0, endTier: 99 }, activeTechId = null }) {
  let result = techs || [];
  result = filterTechsByArea(result, area);
  result = filterTechsByCategory(result, category);
  result = filterTechsBySpecies(result, species, isExclusive);
  result = filterConnected(result, activeTechId);
  result = filterTechsByTier(result, tierRange);
  return result;
}

// UI helper: populate species <select> from assets/species.json and notify when done
export function loadSpeciesFilter(speciesSelectEl, { onLoaded } = {}) {
  if (!speciesSelectEl) return Promise.resolve([]);
  return fetch('assets/species.json')
    .then(response => response.json())
    .then(speciesList => {
      speciesList.forEach(species => {
        const option = document.createElement('option');
        option.value = species;
        option.textContent = species;
        speciesSelectEl.appendChild(option);
      });
      if (typeof onLoaded === 'function') {
        try { onLoaded(speciesList); } catch (_) {}
      }
      return speciesList;
    })
    .catch(error => {
      console.error('Error loading species list:', error);
      return [];
    });
}

// Helper: format category key to display name (e.g., "field_manipulation" -> "Field Manipulation")
function formatCategoryName(category) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// UI helper: populate category <select> from assets/categories.json and notify when done
export function loadCategoryFilter(categorySelectEl, { onLoaded } = {}) {
  if (!categorySelectEl) return Promise.resolve([]);
  return fetch('assets/categories.json')
    .then(response => response.json())
    .then(categoryList => {
      categoryList.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = formatCategoryName(category);
        categorySelectEl.appendChild(option);
      });
      if (typeof onLoaded === 'function') {
        try { onLoaded(categoryList); } catch (_) {}
      }
      return categoryList;
    })
    .catch(error => {
      console.error('Error loading category list:', error);
      return [];
    });
}
