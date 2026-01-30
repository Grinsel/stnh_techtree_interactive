/**
 * Faction Management Module (Phase 2)
 *
 * Handles faction dropdown population and state management
 */

import { loadFactionData, getFactionById } from './data.js';
import { saveState } from './state.js';

let currentFaction = 'federation';  // Default: UFP

/**
 * Initialize faction dropdown with data from factions.json
 */
export async function initFactionDropdown() {
  const factionSelect = document.getElementById('faction-select');
  if (!factionSelect) {
    console.warn('[Factions] faction-select element not found');
    return;
  }

  try {
    // Load faction data
    const factions = await loadFactionData();

    // Clear existing options (except "All Factions")
    while (factionSelect.options.length > 1) {
      factionSelect.remove(1);
    }

    // Filter to playable factions and sort
    const playableFactions = factions
      .filter(f => f.playable)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Add faction options
    playableFactions.forEach(faction => {
      const option = document.createElement('option');
      option.value = faction.id;
      option.textContent = faction.name;

      // Pre-select Federation
      if (faction.id === 'federation') {
        option.selected = true;
      }

      factionSelect.appendChild(option);
    });

    console.log(`[Factions] Loaded ${playableFactions.length} playable factions`);

    // Update faction info display
    updateFactionInfo('federation');

  } catch (error) {
    console.error('[Factions] Failed to load faction data:', error);
  }
}

/**
 * Register faction change event handlers
 */
export function registerFactionEvents() {
  const factionSelect = document.getElementById('faction-select');
  if (!factionSelect) return;

  factionSelect.addEventListener('change', (e) => {
    const selectedFaction = e.target.value;
    currentFaction = selectedFaction;

    console.log(`[Factions] Selected faction: ${selectedFaction}`);

    // Update faction info display
    updateFactionInfo(selectedFaction);

    // Save state
    saveState();

    // NEW Phase 2.4: Trigger re-render with faction filter
    if (typeof window.updateVisualization === 'function') {
      // Get current species filter
      const speciesSelect = document.getElementById('species-select');
      const selectedSpecies = speciesSelect ? speciesSelect.value : 'all';

      // Re-render with faction filter applied
      window.updateVisualization(selectedSpecies, null, false);
    }
  });
}

/**
 * Update faction info display
 */
function updateFactionInfo(factionId) {
  const factionTechCount = document.getElementById('faction-tech-count');
  if (!factionTechCount) return;

  if (factionId === 'all') {
    factionTechCount.textContent = 'Showing all factions';
    return;
  }

  const faction = getFactionById(factionId);
  if (faction) {
    factionTechCount.textContent = `${faction.tech_count} technologies available`;
  } else {
    factionTechCount.textContent = '';
  }
}

/**
 * Get current selected faction
 */
export function getCurrentFaction() {
  return currentFaction;
}

/**
 * Set current faction (programmatically)
 */
export function setCurrentFaction(factionId) {
  currentFaction = factionId;

  const factionSelect = document.getElementById('faction-select');
  if (factionSelect) {
    factionSelect.value = factionId;
    updateFactionInfo(factionId);
  }
}
