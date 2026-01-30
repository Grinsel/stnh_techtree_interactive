# STNH Techtree Interactive - Entwicklungs-Guide

## Übersicht

Dieser Guide beschreibt den vollständigen Entwicklungs-Workflow für das STNH Techtree Interactive Projekt, von der Daten-Extraktion aus den Mod-Dateien bis zum Deployment.

## Entwicklungs-Workflow

### 1. Daten-Aktualisierung aus STNH Mod

Die Technologie-Daten werden aus den STNH Mod-Dateien extrahiert. Dieser Prozess ist **nicht automatisiert** und erfordert manuelle Schritte.

#### Voraussetzungen

- Python 3.x installiert
- PLY (Python Lex-Yacc) Library: `pip install ply`
- Zugriff auf STNH Mod-Dateien (Stellaris Mod-Verzeichnis)

#### Schritt-für-Schritt Anleitung

##### Schritt 1: Localization-Daten extrahieren

```bash
python parse_localisation.py
```

**Was es tut:**
- Liest alle `*_l_english.yml` Dateien aus `localisation/english/`
- Extrahiert Key-Value-Paare (Tech-ID → Name)
- Generiert `localisation_map.json` (~20 MB)

**Input:** `localisation/english/*_l_english.yml`
**Output:** `localisation_map.json`

##### Schritt 2: Trigger-Mapping erstellen

```bash
python create_trigger_map.py
```

**Was es tut:**
- Erstellt hardcodierte Zuordnung von Game-Conditions zu Species
- Z.B. `is_species_class = KDF` → `Klingon`

**Output:** `trigger_map.json`

**Wichtig:** Dieses Mapping muss manuell gepflegt werden, wenn neue Species hinzukommen!

##### Schritt 3: Potential-Blöcke extrahieren (Optional)

```bash
python extract_potentials.py
```

**Was es tut:**
- Findet alle `potential = {...}` Blöcke in Tech-Dateien
- Extrahiert Bedingungen für Verfügbarkeit

**Output:** `potentials.json`

**Hinweis:** Wird derzeit nicht aktiv in der Web-App genutzt, nur für Analyse.

##### Schritt 4: Technologie-JSONs generieren

```bash
python create_tech_json.py
```

**Was es tut:**
- Parst alle Technologie-Dateien aus dem Mod-Verzeichnis
- Extrahiert:
  - ID, Name, Area, Tier, Cost
  - Prerequisites (Abhängigkeiten)
  - Categories, Species-Requirements
  - Unlocks (was diese Tech freischaltet)
  - Rarity-Flag
- Generiert drei separate JSON-Dateien nach Area

**Output:**
- `assets/technology_physics.json` (~340 KB)
- `assets/technology_engineering.json` (~372 KB)
- `assets/technology_society.json` (~351 KB)

**Wichtig:** Diese drei Dateien sind die **Hauptdatenquelle** für die Web-App!

##### Schritt 5: Species & Categories extrahieren

Diese Listen werden manuell gepflegt:

**`assets/species.json`:**
```json
[
  "Borg", "Breen", "Cardassian", "Dominion", "Federation",
  "Ferengi", "Hirogen", "Klingon", "Krenim", "Romulan",
  "Son'a", "Suliban", "Tholian", "Undine", "Vidiian",
  "Voth", "Vulcan", "Xindi-Aquatic", "Xindi-Arboreal",
  "Xindi-Avian", "Xindi-Insectoid", "Xindi-Primate"
]
```

**`assets/categories.json`:**
```json
[
  "Biology", "Computing", "Field Manipulation", "Industry",
  "Materials", "Military Theory", "New Worlds", "Particles",
  "Propulsion", "Statecraft", "Voidcraft"
]
```

Bei Änderungen im Mod müssen diese Listen manuell aktualisiert werden.

### 2. Daten-Verarbeitung Pipeline

```
STNH Mod Files
    ↓
[parse_localisation.py]  →  localisation_map.json
    ↓
[create_trigger_map.py]  →  trigger_map.json
    ↓
[create_tech_json.py]    →  technology_*.json (3 files)
    ↓
Manual: species.json & categories.json
    ↓
Git Commit & Push
    ↓
GitHub Pages Auto-Deploy
```

## Lokale Entwicklung

### Setup

1. **Repository klonen:**
```bash
git clone https://github.com/Grinsel/stnh_techtree_interactive.git
cd stnh_techtree_interactive
```

2. **Lokalen Server starten:**

Da die App JSON-Dateien per `fetch()` lädt, benötigt sie einen HTTP-Server (CORS-Beschränkung):

**Option 1: Python Simple Server**
```bash
python -m http.server 8000
```

**Option 2: Node.js http-server**
```bash
npx http-server -p 8000
```

**Option 3: VSCode Live Server Extension**
- Installiere "Live Server" Extension
- Rechtsklick auf `index.html` → "Open with Live Server"

3. **Im Browser öffnen:**
```
http://localhost:8000
```

### Development-Tools

**Browser DevTools:**
- Console: JavaScript-Fehler debuggen
- Network: JSON-Load Performance prüfen
- Performance: Rendering-Performance analysieren
- Elements: SVG-DOM inspizieren

**Empfohlene Extensions:**
- VSCode: Live Server, ESLint, Prettier
- Browser: Vue DevTools (für State-Debugging)

## Code-Änderungen

### Frontend-Änderungen

**HTML-Änderungen:**
- Bearbeite `index.html` für UI-Layout, neue Filter, etc.
- Inline-CSS ist im `<style>` Block im `<head>`

**JavaScript-Änderungen:**
- Module in `/js/` und `/js/ui/` bearbeiten
- Haupt-Orchestrator: `showcase.js`
- Siehe [ARCHITECTURE.md](./ARCHITECTURE.md) für Modulstruktur

**Wichtig:**
- ES6 Module verwenden (`import`/`export`)
- Keine Build-Tools (direkt im Browser)
- Browser-Kompatibilität beachten (ES6+)

### Neues Feature hinzufügen

#### Beispiel: Rarity-Filter implementieren

**1. Filter-Logik (`filters.js`):**
```javascript
export function filterTechsByRarity(techs, showRare, showCommon) {
  return techs.filter(t => {
    if (showRare && t.is_rare) return true;
    if (showCommon && !t.is_rare) return true;
    return false;
  });
}
```

**2. UI-Element (`index.html`):**
```html
<div class="filter-section">
  <label>Rarity:</label>
  <label><input type="checkbox" id="rarityRare" checked> Rare</label>
  <label><input type="checkbox" id="rarityCommon" checked> Common</label>
</div>
```

**3. State Management (`state.js`):**
```javascript
const DEFAULT_STATE = {
  // ... existing
  showRare: true,
  showCommon: true
}

// In loadState() und saveState() ergänzen
```

**4. Event-Handler (`events.js`):**
```javascript
const rarityRareCheckbox = document.getElementById('rarityRare');
const rarityCommonCheckbox = document.getElementById('rarityCommon');

rarityRareCheckbox.addEventListener('change', () => {
  state.showRare = rarityRareCheckbox.checked;
  saveState(state);
  updateVisualization();
});

rarityCommonCheckbox.addEventListener('change', () => {
  state.showCommon = rarityCommonCheckbox.checked;
  saveState(state);
  updateVisualization();
});
```

**5. Integration (`showcase.js`):**
```javascript
// In updateVisualization():
filtered = filterTechsByRarity(filtered, state.showRare, state.showCommon);
```

### Testing

**Manuelles Testing:**
1. Lokalen Server starten
2. Feature im Browser testen
3. Console auf Fehler prüfen
4. Verschiedene Filter-Kombinationen testen
5. Performance mit großen Datenmengen testen

**Browser-Kompatibilität:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS)

**Performance-Testing:**
- Chrome DevTools → Performance Tab
- Frame Rate Monitor aktivieren
- Force Simulation bei 1000+ Nodes testen
- Zoom/Pan Performance prüfen

## Git-Workflow

### Branch-Strategie

**Main Branch:**
- `main` - Production (auto-deploy zu GitHub Pages)

**Feature-Branches:**
```bash
git checkout -b feature/rarity-filter
# Changes...
git commit -m "Add rarity filter feature"
git push origin feature/rarity-filter
# Create Pull Request
```

### Commit-Messages

Konvention:
```
[Type] Brief description

Details...

- Bullet points for changes
- More details
```

**Types:**
- `[Feature]` - Neue Funktionalität
- `[Fix]` - Bug-Fix
- `[Data]` - Datenaktualisierung
- `[Docs]` - Dokumentation
- `[Refactor]` - Code-Refactoring
- `[Perf]` - Performance-Verbesserung

**Beispiel:**
```
[Feature] Add rarity filter for technologies

Implemented new filter to distinguish between rare and common techs.

- Added filterTechsByRarity() in filters.js
- Added UI checkboxes in index.html
- Integrated with state management
- Updated documentation
```

## Deployment

### GitHub Pages Setup

**Aktuell:**
- Branch: `main`
- Verzeichnis: `/` (root)
- URL: https://grinsel.github.io/stnh_techtree_interactive/

**Deployment-Prozess:**
1. Push zu `main` Branch
2. GitHub Actions triggered automatisch
3. Statische Dateien deployed
4. Website nach ~2-5 Minuten live

**Keine Build-Steps notwendig!**
- Alle Dateien sind statisch (HTML, CSS, JS, JSON)
- Kein Webpack, Vite oder andere Bundler

### Pre-Deployment Checklist

Vor jedem Deployment:

- [ ] Lokaler Test erfolgreich
- [ ] Keine Console-Errors
- [ ] Alle Filter funktionieren
- [ ] Search funktioniert
- [ ] Layouts wechseln funktioniert
- [ ] Share-Links generierbar
- [ ] Performance OK (Force Simulation < 10s)
- [ ] Responsive Design OK (verschiedene Bildschirmgrößen)
- [ ] Browser-Kompatibilität getestet

### Rollback

Falls ein Deployment fehlschlägt:

```bash
git revert HEAD
git push origin main
```

Oder zu spezifischem Commit zurück:
```bash
git reset --hard <commit-hash>
git push --force origin main
```

**Warnung:** `--force` nur verwenden, wenn absolut notwendig!

## Häufige Entwicklungs-Tasks

### Daten aktualisieren (nach Mod-Update)

```bash
# 1. Neue Mod-Dateien holen
cd /path/to/stellaris/mods/stnh

# 2. Zurück zum Projekt
cd /path/to/stnh_techtree_interactive

# 3. Localization aktualisieren
python parse_localisation.py

# 4. Tech-JSONs generieren
python create_tech_json.py

# 5. Testen
python -m http.server 8000
# Browser öffnen und testen

# 6. Commit & Push
git add assets/*.json localisation_map.json
git commit -m "[Data] Update tech data to STNH v2.x.x"
git push origin main
```

### Neues Layout hinzufügen

1. Erstelle `js/ui/layouts/mylayout.js`:
```javascript
export function renderMyLayout(svg, nodes, links, simulation) {
  // Layout-Logik...

  // Setze x, y für jeden Node
  nodes.forEach(node => {
    node.x = /* ... */;
    node.y = /* ... */;
  });

  // Render
  renderNodeBase(nodeGroup);
  renderTierIndicator(nodeGroup);
  renderNodeLabels(nodeGroup);
  renderStraightLinks(linkGroup);
}
```

2. Import in `render.js`:
```javascript
import { renderMyLayout } from './ui/layouts/mylayout.js';
```

3. Zu `renderGraph()` hinzufügen:
```javascript
case 'mylayout':
  renderMyLayout(svg, nodes, links, simulation);
  break;
```

4. UI-Option in `index.html`:
```html
<option value="mylayout">My Layout</option>
```

### Performance optimieren

**Große Datenmengen:**
- Implementiere Canvas-Rendering statt SVG
- Verwende Web Workers für Force Simulation
- Lazy Load für localisation_map.json

**Force Simulation:**
- Reduziere `alphaDecay` für schnellere Konvergenz
- Limitiere `iterations` pro Tick
- Verwende `d3.quadtree` für Collision Detection

**DOM-Optimierung:**
- Verwende `d3.selection.join()` für effiziente Updates
- Implementiere Virtual Scrolling für lange Listen
- Reduziere SVG-Elemente mit Aggregation

## Debugging

### Häufige Probleme

**Problem: JSON-Dateien laden nicht**
- **Ursache:** Kein HTTP-Server (file://-Protokoll)
- **Lösung:** Verwende `python -m http.server` oder Live Server

**Problem: Force Simulation friert ein**
- **Ursache:** Zu viele Nodes (>2000)
- **Lösung:** Filter anwenden, LOD implementieren

**Problem: State wird nicht gespeichert**
- **Ursache:** localStorage blockiert (Privacy-Einstellungen)
- **Lösung:** URL-Parameter als Fallback verwenden

**Problem: Share-Link funktioniert nicht**
- **Ursache:** State-Serialisierung fehlerhaft
- **Lösung:** `saveState()` Debugging, URL-Encoding prüfen

### Debug-Tools

**Console-Logging:**
```javascript
console.log('Current state:', state);
console.log('Filtered techs:', filtered.length);
console.log('Graph nodes:', nodes.length, 'links:', links.length);
```

**D3 Selection Inspector:**
```javascript
// In Browser Console
d3.selectAll('.node').size()  // Anzahl Nodes
d3.selectAll('.link').size()  // Anzahl Links
```

**Performance Profiling:**
```javascript
console.time('filterTechs');
filtered = filterTechsByArea(techs, 'physics');
console.timeEnd('filterTechs');
```

## Best Practices

### Code-Qualität

- **ES6+ Features verwenden:** Arrow Functions, `const`/`let`, Template Literals
- **Pure Functions bevorzugen:** Besonders in `filters.js` und `data.js`
- **Kommentare für komplexe Logik:** Graph-Algorithmen, Force Simulation
- **Naming Conventions:** camelCase für Variablen, PascalCase für Konstruktoren

### Performance

- **Vermeiden:** DOM-Manipulation in Loops
- **Vermeiden:** Synchrones Layout Thrashing
- **Verwenden:** `requestAnimationFrame` für Animationen
- **Verwenden:** D3's `.join()` für effiziente Updates

### Accessibility

- **Tastatur-Navigation:** Tab-Order, Enter/Space für Buttons
- **Screen Reader:** ARIA-Labels für SVG-Elemente
- **Kontrast:** WCAG AA-Konformität für Farben
- **Responsive:** Mobile-first Design

## Ressourcen

**D3.js Dokumentation:**
- https://d3js.org/
- Force Simulation: https://d3js.org/d3-force
- Zoom: https://d3js.org/d3-zoom

**Graph-Theorie:**
- BFS/DFS Algorithmen
- Connected Components
- Shortest Path (Dijkstra, A*)

**Stellaris Modding:**
- STNH Mod Discord
- Stellaris Modding Wiki
- Paradox Forums

## Kontakt

Bei Fragen zum Entwicklungs-Workflow:
- GitHub Issues: https://github.com/Grinsel/stnh_techtree_interactive/issues
- Discord: @Grinsel (STNH Community)
