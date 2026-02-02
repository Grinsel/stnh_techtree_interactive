# STNH Techtree Interactive - Technische Architektur

## Übersicht

Das STNH Techtree Interactive ist eine Single-Page-Web-Anwendung zur interaktiven Visualisierung des Technologiebaums der Star Trek: New Horizons Mod für Stellaris. Die Anwendung basiert auf D3.js und nutzt moderne JavaScript-Module für eine saubere Trennung der Zuständigkeiten.

## Systemarchitektur

### Rendering Pipeline

```
1. HTML Load
   ↓
2. D3.js vom CDN laden
   ↓
3. showcase.js initialisiert alle Module
   ↓
4. Paralleles Laden der Tech-Daten (3 JSON-Dateien)
   ↓
5. Graph aufbauen (Nodes + Links aus Prerequisites)
   ↓
6. Filter anwenden (Species, Area, Tier, Category, Search)
   ↓
7. Layout berechnen (Force-Directed oder andere Algorithmen)
   ↓
8. SVG rendern (Nodes, Links, Labels, Tier-Indikatoren)
   ↓
9. Interaktionen aktivieren (Drag, Zoom, Click, Search)
```

## Modulare Struktur

### Layer-Architektur

Die Anwendung folgt einer geschichteten Architektur:

```
┌─────────────────────────────────────────────┐
│         Presentation Layer (UI)             │
│  - events.js, tabs.js, popup.js, history.js │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Application Layer (Orchestration)     │
│         - showcase.js (Main Controller)     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        Business Logic Layer                 │
│  - filters.js, search.js, state.js          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Rendering Layer                     │
│  - render.js, layouts/*, zoom.js, drag.js   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          Data Layer                         │
│  - data.js (Graph-Algorithmen & Data Fetch) │
└─────────────────────────────────────────────┘
```

## Kern-Module

### 1. showcase.js - Hauptorchestrator (40 KB)

**Verantwortlichkeiten:**
- Zentraler Controller, der alle anderen Module koordiniert
- Initialisierung bei DOM-Ready
- Verwaltung globaler State-Variablen (SVG, nodes, links, zoom)
- Event-Handler-Registrierung
- History-Navigation (Back/Forward)

**Wichtige Funktionen:**
- `zoomToTech(techId)` - Zoom zu spezifischer Technologie
- `setActiveTech(techId)` - Setzt aktive Technologie mit Highlighting
- `updateVisualization()` - Re-Rendering mit aktuellen Filtern

### 2. data.js - Datenmanagement (7.5 KB)

**Verantwortlichkeiten:**
- Laden der Technologie-Daten (Physics, Engineering, Society)
- Caching und Indexierung
- Graph-Algorithmen (BFS, Path-Finding)

**API:**
```javascript
// Daten laden
await loadTechnologyData()

// Graph-Traversierung
getConnectedTechIds(techId, direction) // 'ancestors' | 'descendants' | 'both'
getPrerequisites(techId)

// Pfad-Analyse
calculateShortestPath(startId, endId)
calculateAllPaths(startId, endId)
buildLinksFromPrereqs(technologies)
```

**Algorithmen:**
- BFS (Breadth-First Search) für kürzeste Pfade
- Rekursive Traversierung für alle Prerequisites
- Graph-Link-Generierung aus Prerequisites

### 3. filters.js - Filterlogik (3.4 KB)

**Pure Functions** - keine DOM-Manipulation, nur Datenfilterung:

```javascript
filterTechsByArea(techs, area)        // 'physics' | 'society' | 'engineering' | 'all'
filterTechsBySpecies(techs, species)  // z.B. 'Federation', 'Klingon'
filterTechsByTier(techs, min, max)    // Tier-Range 0-5
filterTechsByCategory(techs, category)// z.B. 'Propulsion', 'Voidcraft'
filterConnected(techs)                // Entfernt isolierte Techs (0-1 Connections)
```

### 4. state.js - State Management (4 KB)

**Zustandsverwaltung:**
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

loadState()       // Lädt aus URL-Parametern oder localStorage
saveState(state)  // Persistiert in localStorage
applyState(state) // Wendet State auf UI-Elemente an
```

**Persistenz:**
- URL-Parameter für Share-Links
- localStorage für User-Präferenzen
- Cookies für einfache Session-Daten

### 5. search.js - Suchfunktionalität (6.6 KB)

**Features:**
- Pattern-Matching auf Tech-Namen und IDs
- "Search Current View" vs. "Search All Techs"
- Grid-Layout für multiple Ergebnisse
- Auto-Zoom bei Einzelergebnis

**Workflow:**
```javascript
runSearch(pattern, searchAll=false)
  ↓
findMatchingTechs(pattern, techs)
  ↓
[1 Result] → zoomToTech()
[Multiple] → Grid-Layout rendern
```

### 6. render.js - Rendering-Utilities (23.5 KB)

**Haupt-Rendering-Funktionen:**

```javascript
// SVG-Erstellung mit Zoom/Pan
createSvgFor(container, width, height)

// Graph-Rendering-Dispatcher
renderGraph(svg, nodes, links, layout)

// Visuelle Elemente
renderNodeBase(selection)           // Colored Rectangles
renderTierIndicator(selection)      // Tier-Streifen
renderNodeLabels(selection)         // Text-Labels
renderStraightLinks(linkGroup)      // Prerequisite-Linien

// Utilities
getAreaColor(area)                  // Physics: #2a7fff, Society: #36d673, Engineering: #ffb400
formatTooltip(tech)                 // Rich HTML Tooltip
wrapText(text, width)               // SVG Text Wrapping
updateLOD(svg, zoom)                // Level-of-Detail Optimization

// Path-Analyse
calculateAndRenderPath(startId, endId)
```

**Level-of-Detail (LOD):**
- Bei Zoom < 0.5: Keine Labels
- Bei Zoom 0.5-1.0: Nur Tech-Namen
- Bei Zoom > 1.0: Volle Details

## Layout-Algorithmen

Alle Layouts befinden sich in `/js/ui/layouts/`:

### 1. force.js - Force-Directed Layout

**Basis:** D3.js Force Simulation

**Forces:**
- `d3.forceManyBody()` - Abstoßung zwischen Nodes (charge: -300)
- `d3.forceLink()` - Link-Constraints zwischen verbundenen Techs
- `d3.forceCenter()` - Zentriert den Graph
- `d3.forceCollide()` - Verhindert Überlappung (radius: 40)

**Performance:**
- Adaptive LOD während der Simulation
- Alpha-Decay für schrittweise Beruhigung

### 2. arrows.js - Force + Directional Arrows

Identisch zu `force.js`, aber mit SVG-Arrows für Link-Richtung.

### 3. disjoint.js - Disjoint Components

**Use Case:** Fragmentierte Tech-Trees (unverbundene Komponenten)

**Algorithmus:**
1. Connected Components Detection
2. Separate Force-Simulation pro Komponente
3. Horizontales Layout der Komponenten

### 4. tier.js - Tier-basiertes Layout

**Strategie:** Vertikale Spalten nach Tier-Level

```
Tier 0  Tier 1  Tier 2  Tier 3  Tier 4  Tier 5
  │       │       │       │       │       │
 [T]     [T]     [T]     [T]     [T]     [T]
 [T]     [T]     [T]     [T]     [T]     [T]
  │       │       │       │       │       │
```

**Vorteile:**
- Klare hierarchische Struktur
- Einfache Navigation
- Gut für Path-Analyse

### 5. grid.js - Grid Layout

**Use Case:** Search-Ergebnisse

**Algorithmus:** Simple Grid-Positionierung (Rows × Columns)

## UI-Highlighting-Module

### Path-Highlight (path-highlight.js)

**Zweck:** Zeigt bei Hover alle Prerequisites oder Dependents einer Tech

**Features:**
- **Entkoppelt**: Funktioniert unabhängig von der aktiven (gelben) Tech
- **Bidirektional**: Toggle zwischen Prerequisites (←) und Dependents (→)
- **Ghost-Nodes**: Gefilterte Techs werden als Ghost-Nodes angezeigt
- **Dimming**: Nicht-relevante Nodes werden ausgeblendet

**Algorithmus:**
```javascript
// Prerequisites: Rekursive Sammlung aller Voraussetzungen
getAllPrerequisites(techId) → Set<techId>

// Dependents: Alle Techs die diese Tech als Prereq haben
getAllDescendants(techId) → Set<techId>
```

### Filter-Highlight (filter-highlight.js)

**Zweck:** Hebt Techs hervor die Category/Unlock-Filter matchen

**Features:**
- Toggle "Highlight Filters" in Sidebar
- Zeigt ALLE Techs, dimmt nicht-matchende
- Kombiniert Category + Unlock Filter
- Kein Re-Rendering nötig - nur CSS-Klassen

### Tooltip-Toggle

**Zweck:** Ein/Ausschalten des Tooltips beim Hover

**Location:** `#view-legend` unter den Zoom-Buttons

**Implementierung:** Alle mouseover-Handler prüfen `#tooltip-toggle.checked`

---

## UI-Interaktionen

### Event-System (events.js)

Zentrale Event-Handler für:
- Filter-Änderungen (Species, Area, Category, Tier)
- Search Input & Buttons
- Layout-Selection
- Copy/Share URL
- Reset Button
- Navigation (Back/Forward)
- Tab-Switching

### Drag-Behavior (drag.js)

D3-Drag für Force-Layouts:
```javascript
const drag = d3.drag()
  .on('start', dragStarted)
  .on('drag', dragged)
  .on('end', dragEnded)
```

### Zoom-Behavior (zoom.js)

**Funktionen:**
- `zoomToFit(svg, nodes)` - Auto-Fit Graph zu Viewport
- `zoomByFactor(svg, factor)` - Zoom In/Out vom Zentrum

### Node-Selection (selection.js)

**Path-Analyse:**
1. Rechtsklick auf Node 1 → Start (Lime)
2. Rechtsklick auf Node 2 → End (Red)
3. Berechne Pfad → Zeige in Popup

## Datenstrukturen

### Technology Object

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
  "unlocks": [
    {"type": "technology", "id": "tech_physics_99", "label": "Advanced Shields"}
  ],
  "category": ["Field Manipulation"],
  "is_rare": true
}
```

### Graph Data Structures

**Nodes:**
```javascript
{
  id: "tech_physics_11282",
  data: {...}, // vollständiges Tech-Object
  x: 100,      // Position (von Layout berechnet)
  y: 200,
  fx: null,    // Fixed position (optional)
  fy: null
}
```

**Links:**
```javascript
{
  source: nodeObject,  // Node-Objekt oder ID
  target: nodeObject,
  type: "prerequisite"
}
```

## Performance-Optimierungen

### 1. Level-of-Detail (LOD)

- Dynamisches Ausblenden von Details bei niedrigem Zoom
- Reduziert DOM-Komplexität drastisch

### 2. Lazy Loading

- Paralleles Laden der drei Tech-JSON-Dateien
- Caching in memory nach erstem Load

### 3. Efficient Filtering

- Pure Functions ohne DOM-Manipulation
- Filter-Pipeline: Area → Species → Tier → Category → Connected

### 4. Force Simulation Optimization

- Alpha-Decay für schnelle Konvergenz
- Collision Detection nur wenn nötig
- Tick-Throttling bei hoher Node-Anzahl

## State Management Flow

```
User Action (Filter/Search)
  ↓
State Update (state.js)
  ↓
Save to localStorage
  ↓
Apply Filters (filters.js)
  ↓
Update Visualization (showcase.js)
  ↓
Re-render Graph (render.js + layouts)
  ↓
Update URL für Share-Link
```

## Deployment

**Hosting:** GitHub Pages

**Deployment:**
1. Push zu `main` Branch
2. GitHub Actions build & deploy (automatisch)
3. Live unter: https://grinsel.github.io/stnh_techtree_interactive/

**Requirements:**
- Statische Dateien only (HTML, CSS, JS, JSON, PNG)
- Keine Server-side Logic
- Alle Assets unter 100 MB (GitHub Pages Limit)

## Bekannte Performance-Bottlenecks

1. **localisation_map.json (20 MB)**
   - Initialer Download dauert lange
   - Mögliche Lösung: Kompression, CDN, Code-Splitting

2. **Force Simulation bei >1000 Nodes**
   - Kann mehrere Sekunden dauern
   - Lösung: LOD, Web Workers (zukünftig)

3. **DOM-Komplexität bei Full Tree**
   - 4000+ SVG-Elemente
   - Lösung: Canvas-Rendering (zukünftig), Virtualisierung

## Erweiterbarkeit

### Neues Layout hinzufügen

1. Erstelle `/js/ui/layouts/mylayout.js`
2. Exportiere `renderMyLayout(svg, nodes, links, simulation)`
3. Importiere in `render.js`
4. Füge zu `renderGraph()` switch-case hinzu
5. Füge Option zu UI (index.html) hinzu

### Neuen Filter hinzufügen

1. Füge Filter-Funktion zu `filters.js` hinzu
2. Aktualisiere `DEFAULT_STATE` in `state.js`
3. Füge UI-Element zu `index.html` hinzu
4. Registriere Event-Handler in `events.js`
5. Integriere in `updateVisualization()` Pipeline

### Neue Datenquelle integrieren

1. Aktualisiere Python-Parser-Skripte
2. Generiere neue JSON-Dateien
3. Passe `data.js` Loader an (falls Schema ändert)
4. Update `assets/` Verzeichnis

## Technologie-Stack

- **D3.js v7** - Graph-Rendering, Force Simulation, Zoom/Pan
- **Vanilla JavaScript (ES6+)** - Modules, Arrow Functions, Async/Await
- **CSS Grid & Flexbox** - Layout
- **localStorage API** - State Persistenz
- **URL Search Params** - Share-Links
- **GitHub Pages** - Hosting
