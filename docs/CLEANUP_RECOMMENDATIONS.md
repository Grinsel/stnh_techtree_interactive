# STNH Techtree Interactive - Cleanup-Empfehlungen

## Übersicht

Dieses Dokument identifiziert alle nicht notwendigen Dateien im Repository und gibt konkrete Empfehlungen für das Aufräumen der Projektstruktur.

## Zusammenfassung

### Status Quo

| Kategorie | Anzahl Dateien | Status |
|-----------|----------------|--------|
| **Essentiell (Website)** | ~30 | ✅ Behalten |
| **Development Tools** | 7 | 🔧 Reorganisieren |
| **Relikte/Nicht verwendet** | 3 | ⚠️ Entfernen/Archivieren |
| **Bereits in .gitignore** | ~10 | ✅ Bereits ausgeschlossen |

---

## Kategorie 1: Relikte - Nicht verwendet

### ⚠️ ZU LÖSCHEN

Diese Dateien werden von der Website NICHT verwendet und können sicher gelöscht werden:

#### `potentials.json` (164 KB)
**Aktueller Status:** Im Root-Verzeichnis
**Zweck:** Extracted potential-blocks aus Tech-Dateien
**Verwendung:** Keine - nicht in Web-App genutzt
**Empfehlung:** **LÖSCHEN** oder in `/archive/` verschieben

```bash
# Option 1: Löschen
rm potentials.json

# Option 2: Archivieren
mkdir -p archive
git mv potentials.json archive/
```

---

#### `potentials_analysis.json` (24 KB)
**Aktueller Status:** Im Root-Verzeichnis
**Zweck:** Analyse-Output von potential conditions
**Verwendung:** Keine - nur für Entwickler-Referenz
**Empfehlung:** **LÖSCHEN** oder in `/archive/` verschieben

```bash
# Option 1: Löschen
rm potentials_analysis.json

# Option 2: Archivieren
git mv potentials_analysis.json archive/
```

---

#### `society.json` (213 KB)
**Aktueller Status:** Im Root-Verzeichnis
**Zweck:** Alternative Society-Tree-Daten (altes Format?)
**Verwendung:** Keine - Web-App nutzt `assets/technology_society.json`
**Empfehlung:** **LÖSCHEN** (Alternative wurde durch neues Format ersetzt)

```bash
rm society.json
```

---

#### `js/ui/tooltip.js` (0 bytes)
**Aktueller Status:** Leere Datei in `/js/ui/`
**Zweck:** Placeholder für zukünftige Tooltip-Logik
**Verwendung:** Keine - Tooltips sind in `render.js` implementiert
**Empfehlung:** **LÖSCHEN** (unnötiger Placeholder)

```bash
rm js/ui/tooltip.js
```

---

## Kategorie 2: Development Tools - Reorganisieren

### 🔧 IN SEPARATES VERZEICHNIS VERSCHIEBEN

Diese Python-Skripte sind für Daten-Updates notwendig, aber NICHT Teil der Website. Sie sollten in ein separates Verzeichnis verschoben werden.

**Empfehlung:** Erstelle `/scripts/` Verzeichnis für alle Development Tools

#### Betroffene Dateien:

1. `parse.py` (15 KB)
2. `lex.py` (1.7 KB)
3. `create_tech_json.py` (6.9 KB)
4. `parse_localisation.py` (1.5 KB)
5. `extract_potentials.py` (2.1 KB)
6. `create_trigger_map.py` (2.2 KB)
7. `analyze_potentials.py` (2.2 KB)

**Aktion:**

```bash
# Erstelle scripts/ Verzeichnis
mkdir scripts

# Verschiebe alle Python-Dateien
git mv parse.py scripts/
git mv lex.py scripts/
git mv create_tech_json.py scripts/
git mv parse_localisation.py scripts/
git mv extract_potentials.py scripts/
git mv create_trigger_map.py scripts/
git mv analyze_potentials.py scripts/

# Update .gitignore falls notwendig
```

**Vorteil:**
- Klarere Trennung zwischen Website-Code und Development-Tools
- Root-Verzeichnis übersichtlicher
- Einfacher zu verstehen für neue Entwickler

---

## Kategorie 3: Dateien in .gitignore

### ✅ BEREITS AUSGESCHLOSSEN - Keine Aktion notwendig

Diese Dateien sind bereits in `.gitignore` und werden nicht committet:

- `index_old1.html` (alte Version)
- `test.html` (Test-Datei)
- `create_species_list.py` (Legacy-Skript)
- `create_category_list.py` (Legacy-Skript)
- `create-atlas.js` (Unused)
- `node_modules/` (NPM-Abhängigkeiten)
- `package.json` (NPM-Config)
- `package-lock.json` (NPM-Lockfile)
- `parser_output.txt` (Debug-Output)
- `icons/` (Icon-Assets - nicht verwendet)

**Status:** Diese Dateien existieren möglicherweise lokal, sind aber bereits vom Git-Repository ausgeschlossen.

**Empfehlung:** Falls lokal vorhanden, können sie gelöscht werden:

```bash
# Lokale Kopien löschen (falls vorhanden)
rm -f index_old1.html test.html
rm -f create_species_list.py create_category_list.py create-atlas.js
rm -f parser_output.txt
rm -rf icons/
rm -rf node_modules/
rm -f package.json package-lock.json
```

---

## Kategorie 4: Performance-Optimierung

### ⚠️ PERFORMANCE-PROBLEM

#### `localisation_map.json` (20 MB)

**Problem:**
- Größte Datei im Projekt (20 MB)
- Initialer Download dauert lange (besonders auf langsamen Verbindungen)
- Blockiert Initial Page Load

**Aktuelle Verwendung:** ✅ ESSENTIELL - Tech-ID → Name Mapping

**Empfehlungen für Optimierung:**

##### Option 1: Compression (Schnellste Lösung)

GitHub Pages unterstützt automatische gzip-Kompression. Stelle sicher, dass der Server diese sendet.

**Erwartete Größe:** ~2-3 MB (gzip-komprimiert)

##### Option 2: Code-Splitting

Teile `localisation_map.json` in 3 separate Dateien:

- `localisation_physics.json`
- `localisation_engineering.json`
- `localisation_society.json`

**Vorteil:** Nur relevante Daten laden (basierend auf Area-Filter)

**Implementation:**
```javascript
// In data.js
async function loadLocalisationForArea(area) {
  const response = await fetch(`assets/localisation_${area}.json`);
  return await response.json();
}
```

##### Option 3: Lazy Loading

Lade `localisation_map.json` asynchron nach Initial Page Load:

```javascript
// Initial: Zeige Tech-IDs
renderGraph(nodes, links);

// Background: Lade Localisation
loadLocalisation().then(() => {
  // Update Labels mit echten Namen
  updateLabels();
});
```

##### Option 4: CDN mit Aggressive Caching

Hoste `localisation_map.json` auf einem separaten CDN mit langen Cache-Zeiten:

```javascript
const LOCALISATION_URL = 'https://cdn.example.com/localisation_map.json';
```

**Empfohlene Aktion:** Starte mit **Option 1 (Compression)** - einfachste Lösung!

---

## Empfohlene Verzeichnisstruktur (Nach Cleanup)

```
stnh_techtree_interactive/
│
├── docs/                           [✅ Dokumentation]
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── FILE_STRUCTURE.md
│   └── CLEANUP_RECOMMENDATIONS.md
│
├── js/                             [✅ Application Code]
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
│       └── layouts/
│           ├── force.js
│           ├── arrows.js
│           ├── disjoint.js
│           ├── tier.js
│           └── grid.js
│
├── assets/                         [✅ Production Data & Images]
│   ├── technology_physics.json
│   ├── technology_engineering.json
│   ├── technology_society.json
│   ├── species.json
│   ├── categories.json
│   ├── PDGIco.png
│   └── pre_tree_bg.png
│
├── scripts/                        [🔧 Development Tools - NEU!]
│   ├── README.md                   (Anleitung für Daten-Updates)
│   ├── parse.py
│   ├── lex.py
│   ├── create_tech_json.py
│   ├── parse_localisation.py
│   ├── extract_potentials.py
│   ├── create_trigger_map.py
│   └── analyze_potentials.py
│
├── archive/                        [📦 Archiv - NEU! (Optional)]
│   ├── potentials.json
│   └── potentials_analysis.json
│
├── index.html                      [✅ Main Entry Point]
├── showcase.js                     [✅ Main Controller]
├── localisation_map.json           [✅ Data (Performance-Problem!)]
├── trigger_map.json                [✅ Data]
│
├── .gitignore                      [✅ Config]
├── .vscode/                        [✅ IDE Config]
├── README.md                       [✅ Documentation]
├── BETA_TEST.md                    [✅ Documentation]
│
└── .git/                           [Git Repository]
```

---

## Schritt-für-Schritt Cleanup-Plan

### Phase 1: Relikte entfernen (5 Minuten)

```bash
# 1. Lösche nicht verwendete Dateien
rm potentials.json
rm potentials_analysis.json
rm society.json
rm js/ui/tooltip.js

# 2. Commit
git add -A
git commit -m "[Cleanup] Remove unused legacy files

- Removed potentials.json (not used in web app)
- Removed potentials_analysis.json (analysis artifact)
- Removed society.json (replaced by technology_society.json)
- Removed empty tooltip.js placeholder
"
```

---

### Phase 2: Development Tools reorganisieren (10 Minuten)

```bash
# 1. Erstelle scripts/ Verzeichnis
mkdir scripts

# 2. Verschiebe Python-Skripte
git mv parse.py scripts/
git mv lex.py scripts/
git mv create_tech_json.py scripts/
git mv parse_localisation.py scripts/
git mv extract_potentials.py scripts/
git mv create_trigger_map.py scripts/
git mv analyze_potentials.py scripts/

# 3. Erstelle README für scripts/
cat > scripts/README.md << 'EOF'
# Data Processing Scripts

Diese Python-Skripte werden verwendet, um Daten aus den STNH Mod-Dateien zu extrahieren.

## Verwendung

Siehe [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) für detaillierte Anweisungen.

## Skripte

- `create_tech_json.py` - Generiert technology_*.json
- `parse_localisation.py` - Generiert localisation_map.json
- `create_trigger_map.py` - Generiert trigger_map.json
- `parse.py`, `lex.py` - Parser-Utilities

## Voraussetzungen

```bash
pip install ply
```
EOF

# 4. Commit
git add -A
git commit -m "[Refactor] Reorganize development tools into scripts/

- Moved all Python scripts to scripts/ directory
- Added scripts/README.md with usage instructions
- Improves project structure clarity
"
```

---

### Phase 3: Dokumentation hinzufügen (Bereits erledigt!)

```bash
# Dokumentation ist bereits im docs/ Verzeichnis erstellt!

git add docs/
git commit -m "[Docs] Add comprehensive documentation

- ARCHITECTURE.md - Technical architecture overview
- DEVELOPMENT.md - Development workflow guide
- FILE_STRUCTURE.md - Complete file reference
- CLEANUP_RECOMMENDATIONS.md - Cleanup guidelines
"
```

---

### Phase 4: Lokale Development-Artifacts löschen (Optional)

```bash
# Falls vorhanden, lösche lokale Kopien von .gitignore-Dateien
rm -f index_old1.html test.html
rm -f create_species_list.py create_category_list.py create-atlas.js
rm -f parser_output.txt
rm -rf icons/
rm -rf node_modules/
rm -f package.json package-lock.json

# Keine Git-Aktion notwendig (bereits in .gitignore)
```

---

## Performance-Optimierung (Zukünftig)

### TODO: localisation_map.json optimieren

**Priorität:** Mittel (verbessert User Experience)

**Optionen:**

1. **Compression aktivieren** (Einfach, sofort wirksam)
   - GitHub Pages sollte automatisch gzip senden
   - Prüfen mit Browser DevTools → Network → Response Headers
   - Falls nicht: CloudFlare als CDN vorschalten

2. **Code-Splitting** (Mittlerer Aufwand)
   - Split in 3 Dateien (physics, engineering, society)
   - Lazy Load basierend auf Area-Filter
   - Reduziert initiale Last um ~66%

3. **Progressive Enhancement** (Aufwändiger)
   - Initial: Zeige Tech-IDs
   - Background: Lade Localisation
   - Update: Replace IDs mit Namen
   - User kann sofort interagieren

**Empfehlung:** Starte mit Option 1, dann Option 2 falls nötig.

---

## Weitere Verbesserungen

### .gitignore erweitern

Füge hinzu falls fehlend:

```gitignore
# Development artifacts
*.pyc
__pycache__/
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log

# Archives (if created)
archive/
```

---

## Validierung nach Cleanup

### Checklist

Nach dem Cleanup durchführen:

- [ ] Website läuft lokal ohne Fehler
- [ ] Alle Filter funktionieren
- [ ] Search funktioniert
- [ ] Layout-Switching funktioniert
- [ ] Share-Links funktionieren
- [ ] Console zeigt keine 404-Errors
- [ ] Network Tab zeigt korrekte Asset-Loads
- [ ] Python-Skripte funktionieren aus `scripts/`
- [ ] Dokumentation ist aktuell

### Test-Commands

```bash
# 1. Lokaler Server starten
python -m http.server 8000

# 2. Browser öffnen
# http://localhost:8000

# 3. Console prüfen (F12)
# Sollte keine Errors zeigen

# 4. Python-Skripte testen
cd scripts/
python create_tech_json.py
# Sollte ohne Fehler laufen
```

---

## Zusammenfassung

### Dateien zum Löschen

| Datei | Größe | Grund |
|-------|-------|-------|
| `potentials.json` | 164 KB | Nicht verwendet |
| `potentials_analysis.json` | 24 KB | Nicht verwendet |
| `society.json` | 213 KB | Ersetzt durch neues Format |
| `js/ui/tooltip.js` | 0 bytes | Leerer Placeholder |

**Gesamt eingesparte Größe:** ~401 KB

---

### Dateien zum Verschieben

| Datei | Ziel | Grund |
|-------|------|-------|
| `*.py` (7 Dateien) | `scripts/` | Development Tools separieren |

---

### Resultierende Struktur

```
✅ Übersichtliches Root-Verzeichnis
✅ Klare Trennung: Website-Code vs. Dev-Tools
✅ Vollständige Dokumentation in docs/
✅ Keine ungenutzten Relikte
✅ Bereit für zukünftige Entwicklung
```

---

## Nächste Schritte

1. **Review:** Überprüfe diese Empfehlungen
2. **Backup:** Erstelle Backup des aktuellen Zustands (Git-Tag)
3. **Execute:** Führe Cleanup-Plan aus (Phase 1-4)
4. **Test:** Validiere alle Funktionen
5. **Deploy:** Push zu GitHub Pages
6. **Monitor:** Prüfe Live-Website auf Probleme

**Empfohlene Reihenfolge:**
1. Phase 3 (Docs) - Bereits erledigt! ✅
2. Phase 1 (Relikte löschen) - Niedriges Risiko
3. Phase 2 (Dev-Tools verschieben) - Mittleres Risiko
4. Phase 4 (Lokale Artifacts) - Nur lokal, kein Git

**Geschätzte Zeit:** ~30 Minuten

---

## Kontakt

Bei Fragen zu diesen Empfehlungen:
- GitHub Issues: https://github.com/Grinsel/stnh_techtree_interactive/issues
