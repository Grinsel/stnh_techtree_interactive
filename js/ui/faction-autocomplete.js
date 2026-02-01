// Faction/Empire Autocomplete UI Component
// Provides searchable autocomplete for 100+ playable empires

let _input = null;
let _dropdown = null;
let _empires = [];
let _onSelect = null;
let _selectedIndex = -1;
let _currentMatches = [];

/**
 * Initialize the faction autocomplete component
 *
 * @param {Array<Empire>} empires - Array of empire objects from empires.json
 * @param {Function} onSelect - Callback when empire is selected: (empire) => void
 */
export function initFactionAutocomplete(empires, onSelect) {
  _empires = empires || [];
  _onSelect = onSelect;

  _input = document.getElementById('faction-search');
  _dropdown = document.getElementById('faction-dropdown');

  if (!_input || !_dropdown) {
    console.warn('[FactionAutocomplete] Required elements not found');
    return;
  }

  // Input event: filter and show dropdown
  _input.addEventListener('input', handleInput);

  // Focus: show dropdown if there's input
  _input.addEventListener('focus', () => {
    if (_input.value.trim()) {
      handleInput({ target: _input });
    } else {
      // Show all empires on focus if empty
      showAllEmpires();
    }
  });

  // Blur: hide dropdown (with delay to allow click)
  _input.addEventListener('blur', () => {
    setTimeout(() => hideDropdown(), 150);
  });

  // Keyboard navigation
  _input.addEventListener('keydown', handleKeydown);

  // Click outside closes dropdown
  document.addEventListener('click', (e) => {
    if (!_input.contains(e.target) && !_dropdown.contains(e.target)) {
      hideDropdown();
    }
  });
}

/**
 * Handle input changes - filter empires and render dropdown
 */
function handleInput(e) {
  const query = e.target.value.toLowerCase().trim();

  if (!query) {
    showAllEmpires();
    return;
  }

  // Filter empires by name or short_name
  _currentMatches = _empires.filter(emp =>
    emp.name.toLowerCase().includes(query) ||
    (emp.short_name && emp.short_name.toLowerCase().includes(query))
  ).slice(0, 20); // Max 20 results

  _selectedIndex = -1;
  renderDropdown(_currentMatches);
}

/**
 * Show all empires (grouped by quadrant)
 */
function showAllEmpires() {
  _currentMatches = _empires.slice(0, 30); // Show first 30
  _selectedIndex = -1;
  renderDropdown(_currentMatches, true);
}

/**
 * Render the dropdown with matching empires
 */
function renderDropdown(matches, showHint = false) {
  if (matches.length === 0) {
    _dropdown.innerHTML = '<div class="autocomplete-empty">No empires found</div>';
    _dropdown.classList.remove('hidden');
    return;
  }

  let html = '';

  if (showHint && _empires.length > 30) {
    html += `<div class="autocomplete-hint">Showing ${matches.length} of ${_empires.length} empires. Type to filter...</div>`;
  }

  // Group by quadrant for better organization
  const byQuadrant = {};
  for (const emp of matches) {
    const q = emp.quadrant || 'other';
    if (!byQuadrant[q]) byQuadrant[q] = [];
    byQuadrant[q].push(emp);
  }

  // Quadrant display order
  const quadrantOrder = ['major', 'alpha', 'beta', 'gamma', 'delta', 'alternate', 'other'];
  const quadrantLabels = {
    major: 'Major Powers',
    alpha: 'Alpha Quadrant',
    beta: 'Beta Quadrant',
    gamma: 'Gamma Quadrant',
    delta: 'Delta Quadrant',
    alternate: 'Alternate Timeline',
    other: 'Other'
  };

  for (const q of quadrantOrder) {
    if (!byQuadrant[q]) continue;

    html += `<div class="autocomplete-group-header">${quadrantLabels[q]}</div>`;

    for (const emp of byQuadrant[q]) {
      const idx = _currentMatches.indexOf(emp);
      const selectedClass = idx === _selectedIndex ? 'selected' : '';
      const shipsIcon = emp.has_unique_ships ? '<span class="ships-icon" title="Has unique ships">&#9733;</span>' : '';

      html += `
        <div class="autocomplete-item ${selectedClass}" data-index="${idx}">
          <span class="empire-name">${escapeHtml(emp.name)}</span>
          ${shipsIcon}
        </div>
      `;
    }
  }

  _dropdown.innerHTML = html;
  _dropdown.classList.remove('hidden');

  // Add click handlers to items
  _dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent blur
      const idx = parseInt(item.dataset.index, 10);
      if (idx >= 0 && idx < _currentMatches.length) {
        selectEmpire(_currentMatches[idx]);
      }
    });

    item.addEventListener('mouseenter', () => {
      const idx = parseInt(item.dataset.index, 10);
      setSelectedIndex(idx);
    });
  });
}

/**
 * Handle keyboard navigation
 */
function handleKeydown(e) {
  if (_dropdown.classList.contains('hidden')) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      showAllEmpires();
      e.preventDefault();
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex(Math.min(_selectedIndex + 1, _currentMatches.length - 1));
      scrollToSelected();
      break;

    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(Math.max(_selectedIndex - 1, 0));
      scrollToSelected();
      break;

    case 'Enter':
      e.preventDefault();
      if (_selectedIndex >= 0 && _selectedIndex < _currentMatches.length) {
        selectEmpire(_currentMatches[_selectedIndex]);
      }
      break;

    case 'Escape':
      e.preventDefault();
      hideDropdown();
      break;
  }
}

/**
 * Update selected index and highlight
 */
function setSelectedIndex(idx) {
  _selectedIndex = idx;

  // Update visual selection
  _dropdown.querySelectorAll('.autocomplete-item').forEach((item, i) => {
    const itemIdx = parseInt(item.dataset.index, 10);
    item.classList.toggle('selected', itemIdx === _selectedIndex);
  });
}

/**
 * Scroll the dropdown to show selected item
 */
function scrollToSelected() {
  const selected = _dropdown.querySelector('.autocomplete-item.selected');
  if (selected) {
    selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * Select an empire and trigger callback
 */
function selectEmpire(empire) {
  _input.value = empire.name;
  hideDropdown();

  if (_onSelect && typeof _onSelect === 'function') {
    _onSelect(empire);
  }
}

/**
 * Hide the dropdown
 */
function hideDropdown() {
  _dropdown.classList.add('hidden');
  _selectedIndex = -1;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Set the current value programmatically
 *
 * @param {string} empireId - Empire ID to select
 */
export function setSelectedEmpire(empireId) {
  const empire = _empires.find(e => e.id === empireId);
  if (empire && _input) {
    _input.value = empire.name;
  }
}

/**
 * Clear the autocomplete selection
 */
export function clearSelection() {
  if (_input) {
    _input.value = '';
  }
  hideDropdown();
}

/**
 * Get the currently displayed value
 */
export function getCurrentValue() {
  return _input ? _input.value : '';
}
