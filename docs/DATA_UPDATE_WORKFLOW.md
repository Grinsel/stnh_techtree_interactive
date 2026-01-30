# STNH Techtree - Daten-Update Workflow

## Übersicht

Dieser Guide erklärt, wie Sie die Technologie-Daten aus der STNH Mod aktualisieren können, um die interaktive Techtree-Website auf dem neuesten Stand zu halten.

## Setup-Übersicht

### Zwei separate Git-Repositories

1. **STNH Mod (git01 - SOURCE - READ-ONLY)**
   - Pfad: `C:\Users\marcj\git01\New-Horizons-Development`
   - Enthält: Mod-Dateien (>10GB, tausende Textfiles)
   - Status: **Wird NICHT verändert** - nur gelesen!

2. **Techtree Website (git09 - PROJECT - READ/WRITE)**
   - Pfad: `C:\Users\marcj\git09\stnh_techtree_interactive`
   - Enthält: Web-Anwendung + generierte JSON-Daten
   - Status: Arbeitsverzeichnis - hier werden Änderungen gemacht

### Workflow-Prinzip

```
[STNH Mod - git01]  --READ-->  [Parser-Skripte]  --WRITE-->  [Techtree - git09]
  (Mod-Dateien)                 (scripts/)                     (assets/*.json)
```

**Wichtig:** Die Mod-Dateien in git01 werden **NIE** verändert, nur gelesen!

---

## Konfiguration

### config.py

Die Datei `scripts/config.py` enthält alle Pfad-Konfigurationen:

```python
# STNH Mod Source Directory (READ-ONLY)
STNH_MOD_ROOT = r"C:\Users\marcj\git01\New-Horizons-Development"

# Techtree Project Root Directory
TECHTREE_PROJECT_ROOT = r"C:\Users\marcj\git09\stnh_techtree_interactive"
```

**Wenn sich Ihre Pfade ändern**, editieren Sie einfach diese Datei!

### Konfiguration testen

```bash
cd C:\Users\marcj\git09\stnh_techtree_interactive\scripts
python config.py
```

**Output:**
```
============================================================
STNH Techtree Data Processing - Configuration
============================================================

Mod Source (READ-ONLY):
  Root: C:\Users\marcj\git01\New-Horizons-Development
  Tech: C:\Users\marcj\git01\New-Horizons-Development\common\technology
  Loc:  C:\Users\marcj\git01\New-Horizons-Development\localisation\english

Output Destination (WRITE):
  Assets: C:\Users\marcj\git09\stnh_techtree_interactive\assets
  Root:   C:\Users\marcj\git09\stnh_techtree_interactive

Files to Process:
  Technology files: 26
  Localisation files: 46
============================================================

[OK] Configuration validated successfully!
```

---

## Daten-Update Prozess

### Schritt 1: Trigger-Map aktualisieren (Falls neue Species)

**Wann notwendig:** Nur wenn neue Species zur Mod hinzugefügt wurden

```bash
cd C:\Users\marcj\git09\stnh_techtree_interactive\scripts
python create_trigger_map.py
```

**Output:**
```
Successfully created 'C:\Users\marcj\git09\stnh_techtree_interactive\trigger_map.json'
```

**Was es tut:**
- Erstellt hardcodierte Zuordnung: Game-Triggers → Species
- Z.B. `is_species_class = KDF` → `Klingon`

**Wichtig:** Diese Datei muss **manuell gepflegt** werden!

**Neue Species hinzufügen:**
1. Öffne `scripts/create_trigger_map.py`
2. Füge neuen Eintrag in `trigger_map` Dictionary hinzu
3. Skript erneut ausführen

---

### Schritt 2: Localization-Map aktualisieren

**Wann notwendig:** Nach Mod-Updates (neue Technologien, geänderte Namen)

```bash
cd C:\Users\marcj\git09\stnh_techtree_interactive\scripts
python parse_localisation.py
```

**Was es tut:**
- Liest alle `*_l_english.yml` Dateien aus `git01/localisation/english/`
- Extrahiert Tech-ID → Name Mapping (z.B. `tech_physics_11282` → `Invisibility Barrier`)
- Generiert `localisation_map.json` (~20 MB)

**Output:**
```
============================================================
STNH Techtree Data Processing - Configuration
============================================================
[Config Info angezeigt...]

Scanning for localisation files in 'C:\Users\marcj\git01\...\localisation\english'...
Processing file: C:\Users\marcj\git01\...\00_ancient_relics_l_english.yml
Processing file: C:\Users\marcj\git01\...\00_apocalypse_l_english.yml
...

Successfully generated 'C:\Users\marcj\git09\stnh_techtree_interactive\localisation_map.json' with 150000+ entries.
```

**Wichtig:** Diese Datei ist **sehr groß** (~20 MB) - Performance-Bottleneck!

---

### Schritt 3: Technologie-JSONs generieren

**Wann notwendig:** Nach Mod-Updates (neue Technologien, geänderte Abhängigkeiten)

```bash
cd C:\Users\marcj\git09\stnh_techtree_interactive\scripts
python create_tech_json.py
```

**Was es tut:**
- Liest alle Tech-Dateien aus `git01/common/technology/` (nur Files mit "sth" im Namen)
- Parst Technologie-Definitionen (ID, Name, Area, Tier, Cost, Prerequisites, etc.)
- Mapped Species-Requirements via `trigger_map.json`
- Generiert **EINE** `technology.json` Datei in `assets/`

**Output:**
```
============================================================
STNH Techtree Data Processing - Configuration
============================================================
[Config Info...]

Scanning for technology files in 'C:\Users\marcj\git01\...\common\technology'...
Processing file: C:\Users\marcj\git01\...\sth_biology_tech.txt
Processing file: C:\Users\marcj\git01\...\sth_computing_tech.txt
Processing file: C:\Users\marcj\git01\...\sth_field_manipulation_tech.txt
...

Successfully generated 'C:\Users\marcj\git09\stnh_techtree_interactive\assets\technology.json' with 4200+ technologies.
```

**Wichtig:** Das aktuelle Skript generiert **eine** JSON-Datei, nicht drei separate!

---

### Schritt 4: JSON nach Area splitten (Manuell)

Das aktuelle `create_tech_json.py` erzeugt nur **eine** `technology.json`. Die Website erwartet aber **drei** separate Dateien:
- `technology_physics.json`
- `technology_engineering.json`
- `technology_society.json`

**Optionen:**

#### Option A: Skript erweitern (Empfohlen)

Editiere `scripts/create_tech_json.py`:
```python
# Statt einer Datei, drei separate Dateien erstellen:
physics_techs = [t for t in all_technologies if t.get('area') == 'physics']
engineering_techs = [t for t in all_technologies if t.get('area') == 'engineering']
society_techs = [t for t in all_technologies if t.get('area') == 'society']

# Speichern:
with open(os.path.join(output_dir, 'technology_physics.json'), 'w') as f:
    json.dump(physics_techs, f, indent=4)
# ... usw.
```

#### Option B: Manuell splitten (Temporär)

Nutzen Sie ein separates Python-Skript oder JSON-Tool, um `technology.json` nach `area` zu splitten.

---

## Vollständiger Update-Workflow

### Szenario 1: Mod wurde aktualisiert (neue Technologien)

```bash
cd C:\Users\marcj\git09\stnh_techtree_interactive\scripts

# 1. Localization aktualisieren
python parse_localisation.py

# 2. Tech-JSONs generieren
python create_tech_json.py

# 3. (Optional) Nach Area splitten
# [Skript erweitern oder manuell splitten]

# 4. Testen
cd ..
python -m http.server 8000
# Browser: http://localhost:8000

# 5. Git Commit
git add assets/*.json localisation_map.json
git commit -m "[Data] Update tech data to STNH v2.x.x"
git push origin master
```

### Szenario 2: Neue Species hinzugefügt

```bash
cd C:\Users\marcj\git09\stnh_techtree_interactive\scripts

# 1. Trigger-Map aktualisieren (manuell editieren!)
# Editiere create_trigger_map.py, füge neue Species hinzu
python create_trigger_map.py

# 2. Localization aktualisieren
python parse_localisation.py

# 3. Tech-JSONs generieren
python create_tech_json.py

# 4. Testen & Committen
# [wie oben]
```

### Szenario 3: Nur Names/Localization geändert

```bash
cd C:\Users\marcj\git09\stnh_techtree_interactive\scripts

# Nur Localization aktualisieren
python parse_localisation.py

# Testen & Committen
# [wie oben]
```

---

## Datei-Übersicht

### Input-Dateien (aus git01 - READ-ONLY)

| Datei | Pfad | Zweck |
|-------|------|-------|
| Tech-Dateien | `git01/common/technology/sth_*.txt` | Technologie-Definitionen |
| Localization | `git01/localisation/english/*_l_english.yml` | Tech-Namen (Übersetzungen) |

### Output-Dateien (in git09 - GENERATED)

| Datei | Pfad | Größe | Zweck |
|-------|------|-------|-------|
| `localisation_map.json` | `git09/` (root) | ~20 MB | Tech-ID → Name Mapping |
| `trigger_map.json` | `git09/` (root) | ~5 KB | Game-Trigger → Species Mapping |
| `technology.json` | `git09/assets/` | ~1 MB | Alle Technologien (aktuell) |
| `technology_physics.json` | `git09/assets/` | ~340 KB | Physics-Techs (zukünftig) |
| `technology_engineering.json` | `git09/assets/` | ~372 KB | Engineering-Techs (zukünftig) |
| `technology_society.json` | `git09/assets/` | ~351 KB | Society-Techs (zukünftig) |

---

## Troubleshooting

### Problem: "Directory not found"

**Symptom:**
```
Error: Directory 'C:\Users\marcj\git01\New-Horizons-Development\common\technology' not found.
```

**Lösung:**
1. Prüfe, ob der Mod-Pfad korrekt ist
2. Editiere `scripts/config.py` falls Pfad geändert wurde
3. Teste mit `python config.py`

---

### Problem: "No files found"

**Symptom:**
```
Files to Process:
  Technology files: 0
```

**Lösung:**
- Überprüfe `TECH_FILE_FILTER` in `config.py`
- Aktuell: `lambda filename: "sth" in filename and filename.endswith('.txt')`
- Falls Mod-Dateien anders heißen, Filter anpassen

---

### Problem: "Unicode Encode Error"

**Symptom:**
```
UnicodeEncodeError: 'charmap' codec can't encode...
```

**Lösung:**
- Bereits in `config.py` gefixt (Emojis entfernt)
- Falls weiterhin auftritt: Windows Terminal auf UTF-8 setzen

---

### Problem: "localisation_map.json zu groß"

**Symptom:** Initial Page Load dauert zu lange

**Lösung (zukünftig):**
1. **Compression:** GitHub Pages sollte gzip automatisch aktivieren
2. **Code-Splitting:** Split in 3 Dateien (physics, engineering, society)
3. **Lazy Loading:** Lade asynchron nach Initial Page Load
4. **CDN:** Hoste auf separatem CDN mit aggressive Caching

Siehe `docs/CLEANUP_RECOMMENDATIONS.md` für Details.

---

## Performance-Tipps

### Parser-Geschwindigkeit

Die Parser-Skripte sind **relativ langsam** (mehrere Minuten), weil:
- 26 Tech-Dateien (teilweise >1 MB)
- 46 Localisation-Dateien
- Komplexes Parsing (Regex, Bracket-Matching)

**Optimierungen:**
- Nutze Python 3.11+ (schnellerer Interpreter)
- Lazy Loading (nur geänderte Dateien neu parsen)
- Multiprocessing (paralleles Parsen)

### Selective Updates

Wenn nur **Namen** geändert wurden:
```bash
# Nur Localization aktualisieren (schneller!)
python parse_localisation.py
```

Wenn nur **neue Techs** hinzugefügt wurden:
```bash
# Nur Tech-JSONs generieren
python create_tech_json.py
```

---

## Balance Center Integration (Zukünftig?)

Die STNH Mod enthält ein ausgefeiltes **Balance Center Tool** mit modernen Parsern (`git01/balance_center/`).

**Dokumentation:**
- `git01/balance_center/docs/PARSER_DOCUMENTATION_INDEX.md`
- `git01/balance_center/docs/PARSER_QUICK_REFERENCE.md`

**Potential:**
- Nutze `technology_parser.py` aus Balance Center
- Modernere Architektur (GameDataRepository Pattern)
- Bessere Performance (Lazy Loading, Caching)

**Hinweis:** Aktuell nutzen wir **separate, einfachere Parser** im Techtree-Projekt. Eine Integration mit dem Balance Center wäre eine größere Refaktorierung.

---

## Nächste Schritte (TODO)

1. **create_tech_json.py erweitern:**
   - Generiere 3 separate JSON-Dateien statt einer
   - Extrahiere `unlocks` und `category` Felder (aktuell fehlen diese!)
   - Verbessere `is_rare` Detection

2. **Performance-Optimierung:**
   - localisation_map.json komprimieren oder splitten
   - Lazy Loading implementieren

3. **Automatisierung:**
   - GitHub Actions für automatische Updates?
   - Webhook bei Mod-Updates?

4. **Balance Center Integration:**
   - Prüfe, ob Balance Center Parser genutzt werden können
   - Könnte robuster und schneller sein

---

## Weitere Informationen

- **Architektur:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Development:** [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Dateistruktur:** [FILE_STRUCTURE.md](./FILE_STRUCTURE.md)
- **Cleanup:** [CLEANUP_RECOMMENDATIONS.md](./CLEANUP_RECOMMENDATIONS.md)
- **Balance Center Docs:** `C:\Users\marcj\git01\New-Horizons-Development\balance_center\docs\`
