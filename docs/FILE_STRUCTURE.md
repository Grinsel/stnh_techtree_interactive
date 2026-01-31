# STNH Techtree Interactive - Dateistruktur-Übersicht

## Verzeichnisstruktur

```
stnh_techtree_interactive/
├── docs/                           [Dokumentation - NEU]
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── FILE_STRUCTURE.md
│   ├── PERFORMANCE_IMPROVEMENTS.md
│   └── CLEANUP_RECOMMENDATIONS.md
│
├── js/                             [JavaScript-Module]
│   ├── main.js
│   ├── data.js
│   ├── filters.js
│   ├── search.js
│   ├── state.js
│   ├── render.js
│   └── ui/
│       ├── events.js
│       ├── selection.js
│       ├── drag.js
│       ├── zoom.js
│       ├── tabs.js
│       ├── tiers.js
│       ├── history.js
│       ├── popup.js
│       ├── tooltip.js
│       └── layouts/
│           ├── force.js
│           ├── arrows.js
│           ├── disjoint.js
│           ├── tier.js
│           └── grid.js
│
├── assets/                         [Daten & Bilder]
│   ├── technology_physics.json
│   ├── technology_engineering.json
│   ├── technology_society.json
│   ├── species.json
│   ├── categories.json
│   ├── PDGIco.png
│   └── pre_tree_bg.png
│
├── Python Scripts (Data Processing)
│   ├── parse.py
│   ├── lex.py
│   ├── create_tech_json.py
│   ├── parse_localisation.py
│   ├── extract_potentials.py
│   ├── create_trigger_map.py
│   └── analyze_potentials.py
│
├── Data Files
│   ├── localisation_map.json
│   ├── trigger_map.json
│   ├── potentials.json              [RELIKT - nicht verwendet]
│   ├── potentials_analysis.json     [RELIKT - nicht verwendet]
│   └── society.json                 [RELIKT - alternatives Format]
│
├── Configuration
│   ├── .gitignore
│   ├── .vscode/settings.json
│   ├── README.md
│   └── BETA_TEST.md
│
├── Application Entry Points
│   ├── index.html                   [Haupt-HTML-Datei]
│   └── showcase.js                  [Haupt-JavaScript-Orchestrator]
│
└── .git/                            [Git-Repository]
```

---

## Dateien im Detail

### 📄 Haupt-Anwendungsdateien

#### `index.html` (33 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Haupt-HTML-Seite der Web-Anwendung

**Inhalt:**
- Komplettes Page-Layout mit Sidebar + Main-Panel
- Embedded CSS (Inline im `<style>`-Block)
- Filter-UI (Species, Area, Tier, Category)
- Search-Bar
- Layout-Selector
- Tech-Details-Panel
- Landing Page Card
- Popup-Windows für Path-Analyse
- Lädt D3.js von CDN: `https://d3js.org/d3.v7.min.js`
- Lädt `showcase.js` als ES6-Modul

**Wichtige Bereiche:**
- `#sidebar` - Linke Sidebar (340px breit)
- `#visualization` - Haupt-Visualisierungs-Panel
- `#popup` - Path-Analyse Popup
- `#help-popup` - Hilfe-Popup
- `#landing-card` - Initial Landing Page

---

#### `showcase.js` (40 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Haupt-Orchestrator der Anwendung

**Verantwortlichkeiten:**
- Koordiniert alle anderen Module
- Initialisiert D3.js SVG mit Zoom/Pan
- Registriert Event-Handler
- Verwaltet globalen State (nodes, links, zoom, etc.)
- Implementiert `updateVisualization()` - Kern-Rendering-Funktion
- Implementiert `setActiveTech()` - Active-Tech-Highlighting
- Implementiert `zoomToTech()` - Zoom zu spezifischer Technologie
- History-Navigation (Back/Forward Buttons)

**Wichtige Globale Variablen:**
```javascript
let svg, zoom, g, simulation;
let allTechnologies = [];
let nodes = [], links = [];
let state = DEFAULT_STATE;
```

---

### 📂 JavaScript-Module (`/js/`)

#### `main.js` (190 bytes)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Modul-Entry-Point

**Code:**
```javascript
import './showcase.js';
```

Lädt `showcase.js`, das wiederum alle anderen Module importiert.

---

#### `data.js` (7.5 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Datenmanagement & Graph-Algorithmen

**Funktionen:**
- `loadTechnologyData()` - Lädt 3 Tech-JSON-Dateien parallel
- `buildLinksFromPrereqs(techs)` - Generiert Graph-Links aus Prerequisites
- `getConnectedTechIds(techId, direction)` - Graph-Traversierung (BFS)
- `getPrerequisites(techId)` - Alle Prerequisites (rekursiv)
- `calculateShortestPath(startId, endId)` - Kürzester Pfad (BFS)
- `calculateAllPaths(startId, endId)` - Alle Pfade zwischen zwei Techs

**Datenstrukturen:**
```javascript
let techCache = [];           // Alle Technologien
let techIndexMap = new Map(); // ID → Index
```

**Keine DOM-Abhängigkeiten** - Pure Data Layer!

---

#### `filters.js` (3.4 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Filter-Logik (Pure Functions)

**Funktionen:**
- `filterTechsByArea(techs, area)` - Physics/Society/Engineering/All
- `filterTechsBySpecies(techs, species)` - Species-Filter
- `filterTechsByTier(techs, minTier, maxTier)` - Tier-Range
- `filterTechsByCategory(techs, category)` - Category-Filter
- `filterConnected(techs)` - Entfernt isolierte Techs (0-1 Connections)
- `loadSpeciesFilter()` - Populated Species-Dropdown
- `loadCategoryFilter()` - Populated Category-Dropdown

**Design:** Alle Funktionen sind **pure functions** - keine Side-Effects, keine DOM-Manipulation.

---

#### `search.js` (6.6 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Search-Funktionalität

**Funktionen:**
- `runSearch(pattern, searchAll=false)` - Haupt-Search-Funktion
- `findMatchingTechs(pattern, techs)` - Pattern-Matching (Regex)

**Features:**
- "Search Current View" vs. "Search All Techs"
- Case-insensitive Matching
- Single Result → Auto-Zoom
- Multiple Results → Grid-Layout

---

#### `state.js` (4 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** State Management & Persistenz

**Funktionen:**
- `loadState()` - Lädt State aus URL-Params oder localStorage
- `saveState(state)` - Speichert in localStorage
- `applyState(state)` - Wendet State auf UI-Elemente an
- `setCookie(name, value, days)` - Cookie-Helper
- `getCookie(name)` - Cookie-Reader

**State-Struktur:**
```javascript
const DEFAULT_STATE = {
  area: 'all',
  species: 'all',
  category: 'all',
  tierStart: 0,
  tierEnd: 5,
  hideIsolated: false,
  layout: 'force',
  focusTech: null
}
```

**Persistenz:**
- localStorage für User-Präferenzen
- URL-Parameter für Share-Links
- Cookies für simple Session-Daten

---

#### `render.js` (23.5 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Rendering-Utilities & Helpers

**Haupt-Funktionen:**
- `createSvgFor(container, width, height)` - SVG mit Zoom/Pan
- `renderGraph(svg, nodes, links, layout)` - Layout-Dispatcher
- `renderStraightLinks(linkGroup)` - Prerequisite-Lines rendern
- `renderNodeBase(selection)` - Colored Rectangles
- `renderTierIndicator(selection)` - Tier-Streifen
- `renderNodeLabels(selection)` - Text-Labels
- `formatTooltip(tech)` - Rich HTML Tooltip
- `getAreaColor(area)` - Color-Mapping
- `wrapText(text, width)` - SVG Text-Wrapping
- `updateLOD(svg, zoom)` - Level-of-Detail Optimization
- `calculateAndRenderPath(startId, endId)` - Path-Analyse & Rendering

**Color Scheme:**
- Physics: `#2a7fff` (Blau)
- Society: `#36d673` (Grün)
- Engineering: `#ffb400` (Gelb/Orange)

**LOD-Logik:**
- Zoom < 0.5: Keine Labels
- Zoom 0.5-1.0: Nur Tech-Namen
- Zoom > 1.0: Volle Details

---

### 📂 UI-Module (`/js/ui/`)

#### `events.js` (8.2 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Zentrale Event-Handler-Registrierung

**Events:**
- Filter-Changes (Species, Area, Category, Tier)
- Search Input & Buttons
- Layout-Selection
- Copy/Share URL
- Reset Button
- Tier Display Toggle
- Back/Forward Navigation
- Tab-Switching

**Exports:**
```javascript
export function attachEventListeners(state, updateVisualization)
```

---

#### `selection.js` (1.5 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Node-Selection für Path-Analyse

**Funktionalität:**
- Rechtsklick auf Node 1 → Start (Lime)
- Rechtsklick auf Node 2 → End (Red)
- Path-Berechnung zwischen Start & End

**Export:**
```javascript
export function createHandleNodeSelection(state, updateVisualization)
```

---

#### `drag.js` (587 bytes)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** D3 Drag-Behavior

**Funktionalität:**
- Nodes in Force-Layouts draggable
- Erhält Simulation-Alpha während Drag
- Fixiert Node-Position

**Export:**
```javascript
export function createDragBehavior(simulation)
```

---

#### `zoom.js` (1.7 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Zoom/Pan-Utilities

**Funktionen:**
- `zoomToFit(svg, nodes)` - Auto-Fit zu Viewport
- `zoomByFactor(svg, factor)` - Zoom In/Out vom Zentrum

---

#### `tabs.js` (1 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Tab-Switching (General/Details)

**Funktionalität:**
- Toggle zwischen Info-Panels
- Styling für aktive Tabs

**Export:**
```javascript
export function initializeTabs()
```

---

#### `tiers.js` (499 bytes)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Tier-Range-Helper

**Funktionalität:**
- Liest Tier-Start & Tier-End Selects
- Gibt Tier-Range-Objekt zurück

**Export:**
```javascript
export function getTierRange()
```

---

#### `history.js` (678 bytes)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Navigation-History (Back/Forward)

**Funktionalität:**
- Enable/Disable History-Buttons
- Maintain History-Stack

**Exports:**
```javascript
export function updateHistoryButtons()
export function initializeHistory()
```

---

#### `popup.js` (5.7 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Popup-Graph für Path-Analyse

**Funktionalität:**
- Separates SVG für Path/Dependency-Visualisierung
- Tier-Based Layout
- Copy-Link für Sharing

**Export:**
```javascript
export function showPathInPopup(techs, links, startId, endId)
```

---

#### `tooltip.js` (0 bytes)
**Status:** ⚠️ LEER - PLACEHOLDER
**Zweck:** Placeholder für zukünftige Tooltip-Logik

**Hinweis:** Derzeit ist Tooltip-Logik in `render.js::formatTooltip()` implementiert.

---

### 📂 Layout-Module (`/js/ui/layouts/`)

#### `force.js`
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Force-Directed Graph Layout

**Algorithmus:** D3.js Force Simulation mit:
- `d3.forceManyBody()` - Abstoßung (charge: -300)
- `d3.forceLink()` - Link-Constraints
- `d3.forceCenter()` - Zentrierung
- `d3.forceCollide()` - Collision Detection (radius: 40)

**Performance:** Adaptive LOD während Simulation

---

#### `arrows.js`
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Force-Directed mit Directional Arrows

**Features:**
- Identisch zu `force.js`
- Zusätzliche SVG-Arrows für Link-Richtung

---

#### `disjoint.js`
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Disjoint Force-Directed (für fragmentierte Graphs)

**Algorithmus:**
1. Detect Connected Components
2. Separate Force-Simulation pro Component
3. Horizontales Layout der Components

---

#### `tier.js` (1.5 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Tier-basiertes Spalten-Layout

**Algorithmus:**
- Vertical Columns nach Tier (0-5)
- Gleichmäßige vertikale Verteilung innerhalb Tier

**Vorteile:**
- Klare Hierarchie
- Ideal für Path-Analyse

---

#### `grid.js` (793 bytes)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Simple Grid-Layout

**Use Case:** Search-Results-Display

**Algorithmus:** Simple Rows × Columns Grid

---

### 📂 Assets (`/assets/`)

#### `technology_physics.json` (340 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Physics-Technologien (~4200+ Techs)

**Schema:**
```json
{
  "id": "tech_physics_11282",
  "name": "Invisibility Barrier",
  "area": "physics",
  "tier": 3,
  "cost": 3200,
  "prerequisites": ["tech_physics_gravity_82"],
  "weight": "135",
  "required_species": ["Federation"],
  "unlocks": [{"type": "technology", "id": "...", "label": "..."}],
  "category": ["Field Manipulation"],
  "is_rare": true
}
```

---

#### `technology_engineering.json` (372 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Engineering-Technologien (~4200+ Techs)

---

#### `technology_society.json` (351 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Society-Technologien (~4100+ Techs)

---

#### `species.json` (358 bytes)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Species-Liste für Filter

**Content:** 23 Species (Federation, Klingon, Romulan, Borg, etc.)

---

#### `categories.json` (196 bytes)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Category-Liste für Filter

**Content:** 11 Categories (Propulsion, Voidcraft, Biology, etc.)

---

#### `PDGIco.png` (41 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Favicon/Logo-Image

---

#### `pre_tree_bg.png` (476 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Background-Image für Landing Page

---

### 📂 Python-Skripte (Data Processing)

#### `parse.py` (15 KB)
**Status:** 🔧 DEVELOPMENT TOOL - NICHT FÜR WEBSITE
**Zweck:** Haupt-Parser für Stellaris-Dateien

**Abhängigkeiten:**
- PLY (Python Lex-Yacc)
- `lex.py`
- `config.py` (scheint zu fehlen?)
- `game_objects` Modul

**Verwendung:** Parst Stellaris Mod-Dateien (Technologien, etc.)

---

#### `lex.py` (1.7 KB)
**Status:** 🔧 DEVELOPMENT TOOL - NICHT FÜR WEBSITE
**Zweck:** Lexical Analyzer für Stellaris-Syntax

**Tokens:**
- BAREWORD, STRING, VARIABLE
- NUMBER, COMPARATOR, OPERATOR
- LBRACE, RBRACE, EQUALS, etc.

---

#### `create_tech_json.py` (6.9 KB)
**Status:** 🔧 DEVELOPMENT TOOL - NICHT FÜR WEBSITE
**Zweck:** Generiert technology_*.json Dateien

**Workflow:**
1. Parst Stellaris Tech-Dateien
2. Extrahiert Tech-Daten
3. Mapped Species-Requirements via `trigger_map.json`
4. Output: 3 JSON-Dateien (physics, engineering, society)

**WICHTIG:** Muss ausgeführt werden bei Mod-Updates!

---

#### `parse_localisation.py` (1.5 KB)
**Status:** 🔧 DEVELOPMENT TOOL - NICHT FÜR WEBSITE
**Zweck:** Parst Localization-YAML-Dateien

**Input:** `localisation/english/*_l_english.yml`
**Output:** `localisation_map.json` (20 MB!)

**Schema:**
```json
{
  "tech_physics_11282": "Invisibility Barrier",
  ...
}
```

---

#### `extract_potentials.py` (2.1 KB)
**Status:** 🔧 DEVELOPMENT TOOL - NICHT FÜR WEBSITE
**Zweck:** Extrahiert `potential = {...}` Blöcke

**Output:** `potentials.json`

**Hinweis:** Derzeit nicht aktiv in Web-App genutzt.

---

#### `create_trigger_map.py` (2.2 KB)
**Status:** 🔧 DEVELOPMENT TOOL - NICHT FÜR WEBSITE
**Zweck:** Erstellt hardcodierte Trigger→Species-Mapping

**Output:** `trigger_map.json`

**Beispiel:**
```json
{
  "species_specific": {
    "is_species_class = KDF": "Klingon",
    "is_species_class = FED": "Federation"
  }
}
```

**WICHTIG:** Muss manuell gepflegt werden!

---

#### `analyze_potentials.py` (2.2 KB)
**Status:** 🔧 DEVELOPMENT TOOL - NICHT FÜR WEBSITE
**Zweck:** Analysiert `potentials.json`

**Output:** `potentials_analysis.json`

**Verwendung:** Statistik & Kategorisierung von Conditions

---

### 📂 Datendateien (Root)

#### `localisation_map.json` (20 MB!)
**Status:** ✅ AKTIV - ESSENTIELL (aber Performance-Problem!)
**Zweck:** Tech-ID → Name Mapping

**Größe:** 192,461 Zeilen, 20 MB

**Problem:** Sehr großer initialer Download!

**Mögliche Optimierung:**
- Kompression (gzip)
- Code-Splitting
- CDN mit Caching
- Lazy Loading

---

#### `trigger_map.json` (5 KB)
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Game-Trigger → Species Mapping

**Verwendung:** `create_tech_json.py` verwendet dies für Species-Requirements

---

#### `potentials.json` (164 KB)
**Status:** ⚠️ RELIKT - NICHT VERWENDET
**Zweck:** Extracted Potential-Blocks aus Tech-Dateien

**Hinweis:** Referenzdaten, nicht aktiv in Web-App genutzt

**Empfehlung:** Kann gelöscht oder in `/data/` verschoben werden

---

#### `potentials_analysis.json` (24 KB)
**Status:** ⚠️ RELIKT - NICHT VERWENDET
**Zweck:** Analyse-Output von Potential-Conditions

**Empfehlung:** Kann gelöscht oder in `/data/` verschoben werden

---

#### `society.json` (213 KB)
**Status:** ⚠️ RELIKT - ALTERNATIVES FORMAT
**Zweck:** Alternative Society-Tree-Daten

**Hinweis:** Nicht verwendet in aktueller App (nutzt `technology_society.json`)

**Empfehlung:** Kann gelöscht werden

---

### 📂 Konfiguration

#### `.gitignore`
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Ausschluss von Development-Artifacts

**Ignored Files:**
- `index_old1.html`
- `test.html`
- `create_species_list.py`
- `create_category_list.py`
- `create-atlas.js`
- `node_modules/`
- `package.json`, `package-lock.json`
- `parser_output.txt`
- `icons/` (both PNG and DDS)

---

#### `.vscode/settings.json`
**Status:** ✅ AKTIV - DEVELOPMENT CONFIG
**Zweck:** VSCode-spezifische Einstellungen

**Content:** Python-Testing-Konfiguration

---

#### `README.md`
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Projekt-Übersicht & User-Dokumentation

**Inhalt:**
- Feature-Liste
- Live-Link
- Beta-Test-Hinweis
- Planned Features

---

#### `BETA_TEST.md`
**Status:** ✅ AKTIV - ESSENTIELL
**Zweck:** Beta-Tester-Anweisungen

**Inhalt:**
- Verwendungsanleitung
- Bekannte Limitierungen
- Feedback-Anweisungen

---

## Datei-Kategorisierung

### ✅ ESSENTIELL - Für Website notwendig

**Application Code:**
- `index.html`
- `showcase.js`
- `/js/` (alle Module)

**Data Files:**
- `assets/technology_*.json` (3 Dateien)
- `assets/species.json`
- `assets/categories.json`
- `localisation_map.json`
- `trigger_map.json`

**Assets:**
- `assets/PDGIco.png`
- `assets/pre_tree_bg.png`

**Documentation:**
- `README.md`
- `BETA_TEST.md`

**Config:**
- `.gitignore`

---

### 🔧 DEVELOPMENT TOOLS - Nicht für Website

**Python Scripts:**
- `parse.py`
- `lex.py`
- `create_tech_json.py`
- `parse_localisation.py`
- `extract_potentials.py`
- `create_trigger_map.py`
- `analyze_potentials.py`

**Hinweis:** Diese sind nur für Daten-Updates notwendig!

---

### ⚠️ RELIKTE - Nicht verwendet

**Data Files:**
- `potentials.json` (Referenz, nicht aktiv genutzt)
- `potentials_analysis.json` (Analyse-Output)
- `society.json` (alternatives Format)

**Code:**
- `js/ui/tooltip.js` (leer, Placeholder)

**Empfehlung:** Siehe [CLEANUP_RECOMMENDATIONS.md](./CLEANUP_RECOMMENDATIONS.md)

---

### 🚫 IN .GITIGNORE - Bereits ausgeschlossen

**Legacy Files:**
- `index_old1.html`
- `test.html`
- `create_species_list.py`
- `create_category_list.py`
- `create-atlas.js`

**Build Artifacts:**
- `node_modules/`
- `package.json`
- `package-lock.json`
- `parser_output.txt`

**Assets:**
- `icons/` (komplett)

---

## Größenübersicht

| Kategorie | Größe |
|-----------|-------|
| **localisation_map.json** | 20 MB ⚠️ |
| **Technology JSONs** | 1.1 MB |
| **Background Image** | 476 KB |
| **JavaScript Total** | ~124 KB |
| **HTML + CSS** | 36 KB |
| **Python Scripts** | ~16 KB |
| **Other Data** | ~400 KB |
| **TOTAL** | ~22 MB |

**Performance-Warnung:** `localisation_map.json` ist mit 20 MB der größte Bottleneck!

---

## Weitere Informationen

Für detaillierte Informationen siehe:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technische Architektur
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Entwicklungs-Workflow
- [CLEANUP_RECOMMENDATIONS.md](./CLEANUP_RECOMMENDATIONS.md) - Aufräum-Empfehlungen
