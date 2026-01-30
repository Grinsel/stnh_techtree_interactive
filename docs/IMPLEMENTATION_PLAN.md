# STNH Techtree Interactive - Komplettierungs-Plan

## Zielsetzung

Den STNH Techtree von **60-65% Vollständigkeit auf 95%+** bringen durch:
1. Vollständige Datenextraktion (Beschreibungen, Effekte, Fraktions-spezifische Namen)
2. Fraktions-UI mit UFP als Default
3. Umfassende Effekt-Anzeige mit geparsten Modifiers + Beschreibungstexten
4. Icons & Visual Polish (Phase 4, später)

**Strategie:** HYBRID - Balance Center Parser nutzen für komplexe Aufgaben, eigene Output-Generierung für Website

---

## Phase 1: Daten-Vollständigkeit (1-2 Wochen, KRITISCH)

### Ziel
Alle fehlenden Tech-Daten extrahieren mittels Balance Center Infrastructure

### Was fehlt aktuell?
- ❌ Beschreibungen (Flavor-Text)
- ❌ Fraktions-spezifische Namen-Varianten
- ❌ Modifiers/Effekte (geparste Boni)
- ❌ Detaillierte Unlock-Informationen
- ❌ Fraktions-Verfügbarkeits-Mappings

### 1.1 Balance Center Integration Setup

**Neue Datei:** `scripts/balance_center_bridge.py`
```python
"""
Adapter-Layer für Balance Center ohne Tight Coupling
"""
import sys
from pathlib import Path

BALANCE_CENTER_ROOT = Path(r"C:\Users\marcj\git01\New-Horizons-Development\balance_center")
sys.path.insert(0, str(BALANCE_CENTER_ROOT))

from engine.game_data_repository import GameDataRepository
from engine.parsers.technology_parser import TechnologyParser
from engine.parsers.faction_detector import FactionDetector
from engine.localization_loader import LocLoader

class BalanceCenterBridge:
    def __init__(self, mod_root):
        self.repository = GameDataRepository(mod_root)
        self.loc_loader = LocLoader(mod_root / 'localisation' / 'english')

    def get_all_technologies_with_metadata(self):
        """Extrahiert ALLE Tech-Daten mit Modifiers, Unlocks, Faction-Mappings"""
        techs = self.repository.get_technologies(
            extract_modifiers=True,
            extract_unlocks=True
        )

        faction_detector = self.repository.faction_detector
        factions = faction_detector.get_all_factions()

        return {
            'technologies': techs,
            'factions': list(factions),
            'faction_mappings': faction_detector.faction_mappings
        }
```

**Ändern:** `scripts/config.py`
```python
# Hinzufügen:
BALANCE_CENTER_ROOT = r"C:\Users\marcj\git01\New-Horizons-Development\balance_center"
USE_BALANCE_CENTER = True  # Fallback-Toggle
```

### 1.2 Neues JSON-Schema

**Erweiterung der Tech-Objekte:**
```json
{
  "id": "tech_physics_11282",
  "name": "Invisibility Barrier",
  "area": "physics",
  "tier": 3,
  "cost": 3200,
  "prerequisites": ["tech_physics_gravity_82"],

  // NEU - Phase 1:
  "description": "Early cloaking technology based on gravimetric principles...",
  "alternate_names": {
    "Federation": "Invisibility Barrier",
    "Romulan": "Basic Cloaking Device",
    "Klingon": "Cloaking Screen"
  },
  "effects": [
    {
      "type": "modifier",
      "key": "ship_cloaking_strength_add",
      "value": 1,
      "display": "+1 Cloaking Strength"
    }
  ],
  "unlock_details": {
    "technologies": ["tech_physics_11283"],
    "components": ["CLOAKING_1"],
    "description": "Enables basic ship cloaking"
  },
  "faction_availability": {
    "Federation": {"available": true, "condition": "default"},
    "Romulan": {"available": true, "condition": "starts_with"},
    "Klingon": {"available": true, "condition": "potential_block"},
    "Borg": {"available": false, "condition": "excluded"}
  },

  // Bestehend:
  "required_species": ["Federation"],
  "weight": 135,
  "unlocks": [...],
  "category": ["Field Manipulation"],
  "is_rare": true
}
```

### 1.3 Parser-Skript Rewrite

**Komplett umschreiben:** `scripts/create_tech_json.py`

**Neue Struktur:**
```python
from balance_center_bridge import BalanceCenterBridge
from config import STNH_MOD_ROOT, OUTPUT_ASSETS_DIR
import json

def generate_complete_tech_data():
    # 1. Balance Center Bridge initialisieren
    bridge = BalanceCenterBridge(STNH_MOD_ROOT)

    # 2. ALLE Daten extrahieren
    data = bridge.get_all_technologies_with_metadata()

    # 3. Zu Website-Format transformieren
    techs_enhanced = []
    for tech in data['technologies']:
        enhanced = transform_tech_to_website_format(
            tech,
            data['faction_mappings'],
            bridge.loc_loader
        )
        techs_enhanced.append(enhanced)

    # 4. Nach Area splitten
    physics = [t for t in techs_enhanced if t['area'] == 'physics']
    engineering = [t for t in techs_enhanced if t['area'] == 'engineering']
    society = [t for t in techs_enhanced if t['area'] == 'society']

    # 5. Schreiben
    write_json(physics, OUTPUT_ASSETS_DIR / 'technology_physics.json')
    write_json(engineering, OUTPUT_ASSETS_DIR / 'technology_engineering.json')
    write_json(society, OUTPUT_ASSETS_DIR / 'technology_society.json')
    write_json(data['factions'], OUTPUT_ASSETS_DIR / 'factions.json')

def transform_tech_to_website_format(tech, faction_mappings, loc_loader):
    """Transformiert Balance Center Format → Website JSON"""

    # Beschreibung aus Localisation
    description = loc_loader.get(f"{tech['name']}_desc", "")

    # Fraktions-spezifische Namen extrahieren
    alternate_names = extract_alternate_names(tech['name'], loc_loader)

    # Modifiers → Display-Format
    effects = parse_modifiers_for_display(tech.get('modifiers', {}))

    # Unlock-Details
    unlock_details = extract_unlock_details(tech.get('unlocks', []), loc_loader)

    # Fraktions-Verfügbarkeit
    faction_availability = determine_faction_availability(tech, faction_mappings)

    return {
        **tech,
        'description': description,
        'alternate_names': alternate_names,
        'effects': effects,
        'unlock_details': unlock_details,
        'faction_availability': faction_availability
    }
```

**Wichtige Hilfsfunktionen:**
- `extract_alternate_names()` - Scannt nach `tech_society_{faction}_marines` Mustern
- `parse_modifiers_for_display()` - `ship_speed_mult = 0.1` → `"+10% Ship Speed"`
- `determine_faction_availability()` - Nutzt FactionDetector + TriggerEvaluator

### 1.4 Localization-Optimierung

**Problem:** `localisation_map.json` = 20MB (Performance-Bottleneck)

**Lösung:** Localisation direkt in Tech-JSONs einbetten statt separate Datei

**Vorteil:**
- Vor: 20MB localisation_map.json + 1.2MB tech JSONs = 21.2MB
- Nach: 0MB localisation_map + 2.5MB tech JSONs (mit Descriptions) = 2.5MB
- **88% Größenreduktion!**

**Aktion:** `scripts/parse_localisation.py` wird OBSOLET (löschen oder archivieren)

### 1.5 Faction Metadata

**Neue Datei:** `assets/factions.json`

**Schema:**
```json
[
  {
    "id": "federation",
    "name": "United Federation of Planets",
    "short_name": "UFP",
    "color": "#0066cc",
    "playable": true,
    "tech_count": 4102
  },
  {
    "id": "klingon",
    "name": "Klingon Empire",
    "short_name": "KDF",
    "color": "#cc0000",
    "playable": true,
    "tech_count": 3987
  }
  // ... alle Fraktionen
]
```

**Generierung:** In `create_tech_json.py` integriert

### Phase 1 Deliverables

- ✅ `scripts/balance_center_bridge.py` (NEU)
- ✅ `scripts/create_tech_json.py` (REWRITE)
- ✅ `scripts/config.py` (ERWEITERT)
- ✅ `assets/technology_physics.json` (ERWEITERT mit neuen Feldern)
- ✅ `assets/technology_engineering.json` (ERWEITERT)
- ✅ `assets/technology_society.json` (ERWEITERT)
- ✅ `assets/factions.json` (NEU)
- ✅ `docs/JSON_SCHEMA.md` (NEU - Schema-Dokumentation)
- ✅ `docs/DATA_UPDATE_WORKFLOW.md` (UPDATE)

### Phase 1 Testing

```python
# tests/test_phase1.py
def test_data_completeness():
    techs = load_json('assets/technology_physics.json')

    assert len(techs) > 4000

    # Mindestens 95% haben Beschreibungen
    with_desc = sum(1 for t in techs if t.get('description'))
    assert with_desc / len(techs) > 0.95

    # Alle haben faction_availability
    assert all('faction_availability' in t for t in techs)
```

---

## Phase 2: Fraktions-UI (1 Woche, HOCH)

### Ziel
Fraktions-Auswahl-UI mit UFP als Default, fraktions-spezifische Namen anzeigen

### 2.1 Faction Dropdown

**Ändern:** `index.html`

**Hinzufügen im Filter-Bereich:**
```html
<div class="filter-group">
  <label for="faction-select">Faction:</label>
  <select id="faction-select">
    <option value="all">All Factions</option>
    <option value="federation" selected>United Federation of Planets</option>
    <option value="klingon">Klingon Empire</option>
    <option value="romulan">Romulan Star Empire</option>
    <!-- Dynamisch aus factions.json gefüllt -->
  </select>
</div>

<div class="faction-info">
  <span id="faction-tech-count">4102 technologies available</span>
</div>
```

### 2.2 State Management

**Ändern:** `js/state.js`

```javascript
const DEFAULT_STATE = {
  // ... bestehend
  faction: 'federation',  // NEU - UFP default
  showFactionExclusive: false
};

export function saveState(state) {
  localStorage.setItem('stnh_techtree_state', JSON.stringify(state));

  // URL für Sharing
  const url = new URL(window.location);
  url.searchParams.set('faction', state.faction);
  window.history.replaceState({}, '', url);
}
```

### 2.3 Faction-Aware Data Loading

**Ändern:** `js/data.js`

```javascript
let _factions = null;

export async function loadFactionData() {
  if (_factions) return _factions;
  const res = await fetch('assets/factions.json');
  _factions = await res.json();
  return _factions;
}

export function filterTechsByFaction(techs, factionId) {
  if (factionId === 'all') return techs;

  return techs.filter(tech => {
    const availability = tech.faction_availability?.[factionId];
    return availability && availability.available;
  });
}

export function getTechName(tech, factionId) {
  if (factionId === 'all' || !tech.alternate_names) {
    return tech.name;
  }
  return tech.alternate_names[factionId] || tech.name;
}
```

### 2.4 Faction-Aware Rendering

**Ändern:** `js/render.js`

```javascript
export function renderNodeLabels(selection, currentFactionId) {
  selection.selectAll('text').remove();

  selection.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text(d => getTechName(d.data, currentFactionId))  // FRAKTIONS-BEWUSST!
    .style('font-size', '12px');
}

export function formatTooltip(tech, currentFactionId) {
  const name = getTechName(tech, currentFactionId);
  const description = tech.description || 'No description';

  let html = `
    <div class="tooltip-header">
      <h3>${name}</h3>
      <span class="area-badge">${tech.area}</span>
      <span class="tier-badge">Tier ${tech.tier}</span>
    </div>

    <div class="tooltip-description">
      <em>${description}</em>
    </div>
  `;

  // Fraktions-exklusiv?
  if (isFactionExclusive(tech, currentFactionId)) {
    html += `<span class="faction-exclusive">⭐ ${currentFactionId}-exclusive</span>`;
  }

  // Effekte (Phase 3)
  if (tech.effects && tech.effects.length > 0) {
    html += `<div class="effects">`;
    tech.effects.forEach(e => html += `• ${e.display}<br>`);
    html += `</div>`;
  }

  return html;
}

function isFactionExclusive(tech, factionId) {
  if (factionId === 'all') return false;
  const availability = tech.faction_availability || {};
  const availableTo = Object.keys(availability).filter(f => availability[f].available);
  return availableTo.length === 1 && availableTo[0] === factionId;
}
```

**Visual Highlighting:**
```javascript
export function renderNodeBase(selection, currentFactionId) {
  selection.append('rect')
    .attr('width', 80)
    .attr('height', 40)
    .style('fill', d => getAreaColor(d.data.area))
    .style('stroke', d => {
      return isFactionExclusive(d.data, currentFactionId) ? '#ffd700' : '#fff';
    })
    .style('stroke-width', d => {
      return isFactionExclusive(d.data, currentFactionId) ? 3 : 1;
    });
}
```

### 2.5 Event Handling

**Ändern:** `js/ui/events.js`

```javascript
export function registerFactionEvents() {
  const factionSelect = document.getElementById('faction-select');

  factionSelect.addEventListener('change', (e) => {
    const selectedFaction = e.target.value;

    // State update
    const newState = { ...getCurrentState(), faction: selectedFaction };
    saveState(newState);

    // Theme update (CSS custom properties)
    updateFactionTheme(selectedFaction);

    // Re-render
    updateVisualization();

    // Tech count update
    updateFactionTechCount(selectedFaction);
  });
}

function updateFactionTheme(factionId) {
  const faction = getFactionById(factionId);
  if (faction) {
    document.documentElement.style.setProperty('--faction-color', faction.color);
  }
}
```

### Phase 2 Deliverables

- ✅ `index.html` (ERWEITERT - Faction Dropdown)
- ✅ `js/state.js` (ERWEITERT - Faction State)
- ✅ `js/data.js` (ERWEITERT - Faction Filtering)
- ✅ `js/render.js` (ERWEITERT - Faction-Aware Display)
- ✅ `js/ui/events.js` (ERWEITERT - Faction Events)
- ✅ CSS für Faction-Exclusive Highlighting

### Phase 2 Testing

- [ ] UFP ist vorausgewählt bei erstem Laden
- [ ] Dropdown zeigt alle Fraktionen aus factions.json
- [ ] Fraktions-Auswahl filtert Tree korrekt
- [ ] Fraktions-spezifische Namen werden angezeigt
- [ ] Fraktions-exklusive Techs haben Gold-Border
- [ ] Tech-Count aktualisiert sich dynamisch

---

## Phase 3: Effekt-Anzeige & Enhanced Tooltips (1 Woche, HOCH)

### Ziel
Umfassende Tech-Info: Geparste Effekte + Beschreibungstexte kombiniert anzeigen

### 3.1 Effect Display Formatting

**Ändern:** `js/render.js`

**Neue Funktion:**
```javascript
export function formatEffects(effects) {
  if (!effects || effects.length === 0) {
    return '<em>No direct effects</em>';
  }

  // Nach Kategorie gruppieren
  const grouped = {
    'Combat': [],
    'Economy': [],
    'Science': [],
    'Ships': [],
    'Other': []
  };

  effects.forEach(effect => {
    const category = determineEffectCategory(effect.key);
    grouped[category].push(effect);
  });

  let html = '';
  for (const [cat, effs] of Object.entries(grouped)) {
    if (effs.length === 0) continue;

    html += `<div class="effect-group">`;
    html += `<strong>${cat}</strong><br>`;
    effs.forEach(e => {
      html += `<span class="effect-item">⚙️ ${e.display}</span><br>`;
    });
    html += `</div>`;
  }

  return html;
}

function determineEffectCategory(key) {
  if (key.includes('weapon') || key.includes('damage')) return 'Combat';
  if (key.includes('ship')) return 'Ships';
  if (key.includes('research')) return 'Science';
  if (key.includes('resource') || key.includes('minerals')) return 'Economy';
  return 'Other';
}
```

### 3.2 Enhanced Tooltip

**Tooltip mit ALLEM:**
```javascript
export function formatTooltip(tech, factionId) {
  const name = getTechName(tech, factionId);

  return `
    <div class="tooltip-header">
      <h3>${name}</h3>
      <div class="tooltip-meta">
        <span class="area-badge">${tech.area}</span>
        <span class="tier-badge">Tier ${tech.tier}</span>
        ${tech.is_rare ? '<span class="rare-badge">⭐ Rare</span>' : ''}
      </div>
    </div>

    <div class="tooltip-description">
      <em>${tech.description || 'No description'}</em>
    </div>

    <div class="tooltip-section">
      <h4>Effects:</h4>
      ${formatEffects(tech.effects)}
    </div>

    <div class="tooltip-section">
      <h4>Unlocks:</h4>
      ${tech.unlock_details?.description || 'Various components'}
    </div>

    <div class="tooltip-footer">
      <span>Cost: ${tech.cost}</span>
      <span>Weight: ${tech.weight}</span>
    </div>
  `;
}
```

### 3.3 CSS für Enhanced Tooltips

**Hinzufügen zu CSS:**
```css
.tooltip-header {
  border-bottom: 1px solid rgba(255,255,255,0.2);
  padding-bottom: 0.5em;
  margin-bottom: 0.5em;
}

.tooltip-meta {
  display: flex;
  gap: 0.5em;
  margin-top: 0.5em;
}

.area-badge {
  padding: 0.2em 0.5em;
  border-radius: 3px;
  font-weight: bold;
}

.area-physics { background: #2a7fff; }
.area-society { background: #36d673; }
.area-engineering { background: #ffb400; }

.tooltip-description {
  font-style: italic;
  margin: 1em 0;
  padding: 0.5em;
  background: rgba(0,0,0,0.3);
  border-left: 3px solid var(--faction-color);
}

.effect-group {
  margin-bottom: 0.5em;
}

.effect-item {
  display: block;
  margin-left: 1em;
  font-size: 0.95em;
}
```

### 3.4 Optional: Detail Panel

**Neue Datei:** `js/ui/detail_panel.js`

**Für Nutzer, die vollständige Tech-Info wollen:**
```javascript
export function showTechDetail(tech, factionId) {
  const panel = document.getElementById('detail-panel');
  panel.innerHTML = `
    <h2>${getTechName(tech, factionId)}</h2>
    <p>${tech.description}</p>

    <h3>Effects</h3>
    ${formatEffectsDetailed(tech.effects)}

    <h3>Unlocks</h3>
    ${formatUnlocksDetailed(tech.unlock_details)}

    <h3>Faction Availability</h3>
    ${formatFactionAvailability(tech.faction_availability)}
  `;
  panel.style.display = 'block';
}
```

### Phase 3 Deliverables

- ✅ `js/render.js` (ERWEITERT - Effect Formatting)
- ✅ Enhanced Tooltip mit allen Infos
- ✅ CSS für strukturierte Tooltips
- ✅ `js/ui/detail_panel.js` (OPTIONAL - Comprehensive Panel)

### Phase 3 Testing

- [ ] Effekte werden korrekt gruppiert angezeigt
- [ ] Beschreibungen sichtbar in Tooltips
- [ ] Tooltips performant (< 50ms Render-Zeit)
- [ ] Detail-Panel zeigt comprehensive Info

---

## Phase 4: Visual Polish & Icons (1-2 Wochen, MEDIUM - SPÄTER)

### Ziel
Tech-Icons einbinden, Fraktions-Farbschemas, Visual Theming

**Status:** DEFERRED - Nicht für initiale Komplettierung notwendig

**Grobe Schritte:**
1. Icons aus Game extrahieren (DDS → WebP Konvertierung)
2. Icon-Sprite-Sheet erstellen
3. Icon-Rendering in Nodes
4. Fraktions-spezifische Farbschemas (CSS Custom Properties)
5. Theme-Switching

---

## Kritische Dateien - Quick Reference

### Phase 1 (Data)
- `scripts/balance_center_bridge.py` - NEU
- `scripts/create_tech_json.py` - REWRITE
- `scripts/config.py` - MODIFY
- `assets/technology_*.json` - OUTPUT (erweitert)
- `assets/factions.json` - OUTPUT (neu)

### Phase 2 (Faction UI)
- `index.html` - MODIFY (Dropdown)
- `js/state.js` - MODIFY (Faction State)
- `js/data.js` - MODIFY (Faction Filtering)
- `js/render.js` - MODIFY (Faction-Aware Display)
- `js/ui/events.js` - MODIFY (Events)

### Phase 3 (Effects)
- `js/render.js` - MODIFY (Effect Formatting)
- `js/ui/detail_panel.js` - NEW (Optional)
- CSS - MODIFY (Tooltip Styling)

---

## Testing-Strategie

### Automated Tests
```python
# tests/test_data_integrity.py
def test_phase1_completeness():
    techs = load_json('assets/technology_physics.json')
    assert all('description' in t for t in techs if not t.get('is_event_only'))
    assert all('faction_availability' in t for t in techs)

def test_faction_data():
    factions = load_json('assets/factions.json')
    assert len(factions) >= 10
    assert all(f['tech_count'] > 1000 for f in factions if f['playable'])
```

### Manual Testing
**Phase 1:**
- [ ] Alle JSONs generiert
- [ ] Datengröße < 5MB
- [ ] > 95% haben Beschreibungen

**Phase 2:**
- [ ] UFP vorausgewählt
- [ ] Alle Fraktionen funktional
- [ ] Fraktions-Namen korrekt

**Phase 3:**
- [ ] Effekte sichtbar
- [ ] Tooltips performant
- [ ] Keine Console-Errors

---

## Rollback & Safety

```bash
# Vor jeder Phase: Backup
git tag phase-0-baseline
git tag phase-1-start
git tag phase-1-complete

# Bei Fehler:
git reset --hard phase-1-start
```

**Fallback-Mechanismen:**
- `config.py`: `USE_BALANCE_CENTER = False` → Zurück zu Simple Parser
- Feature Flags in state.js für neue UI-Features
- JSON Schema mit Version-Field

---

## Timeline & Success Metrics

| Phase | Dauer | Komplexität | Success Metric |
|-------|-------|-------------|----------------|
| Phase 1 | 1-2 Wochen | Hoch | 95%+ Techs mit Beschreibungen, 88% Datenreduktion |
| Phase 2 | 1 Woche | Mittel | Fraktions-UI funktional, UFP default, korrekte Filterung |
| Phase 3 | 1 Woche | Mittel | Effekte sichtbar, Enhanced Tooltips, < 50ms Render |
| **Total (1-3)** | **3-4 Wochen** | - | **Kern-Funktionalität komplett** |
| Phase 4 | 1-2 Wochen | Hoch | Icons & Visual Polish (SPÄTER) |

**End State:** 95%+ Vollständigkeit, alle Kern-Features implementiert

---

## Dokumentation Updates

Nach jeder Phase zu aktualisieren:
- `docs/DATA_UPDATE_WORKFLOW.md` - Vereinfachter Workflow
- `docs/ARCHITECTURE.md` - Fraktions-System, Data Pipeline
- `docs/JSON_SCHEMA.md` - NEU - Komplette Schema-Referenz
- `docs/DEVELOPMENT.md` - Testing, Rollback Procedures
- `README.md` - Feature-Liste, Roadmap

---

## Nächste Schritte

1. **User-Approval einholen** für diesen Plan
2. **Phase 1 starten:** Balance Center Bridge implementieren
3. **Inkrementell testen:** Nach jedem Schritt validieren
4. **Dokumentation parallel:** Docs mit Code aktualisieren
5. **Regelmäßige Commits:** Kleine, nachvollziehbare Änderungen

**Bereit für Implementation!**
