# Data Processing Scripts

Diese Python-Skripte werden verwendet, um Daten aus den STNH Mod-Dateien zu extrahieren und für die Web-Anwendung aufzubereiten.

## Übersicht

Die Skripte in diesem Verzeichnis sind **Development Tools** und werden NICHT für die Website selbst benötigt. Sie dienen ausschließlich dazu, die Technologie-Daten aus den Stellaris Mod-Dateien zu extrahieren und in das benötigte JSON-Format zu konvertieren.

## Wichtig: Zwei separate Repositories!

Die Skripte arbeiten mit **zwei verschiedenen Git-Repositories**:

1. **STNH Mod (git01 - READ-ONLY)**
   - Pfad: `C:\Users\marcj\git01\New-Horizons-Development`
   - **Wird NICHT verändert** - nur gelesen!

2. **Techtree Website (git09 - PROJECT)**
   - Pfad: `C:\Users\marcj\git09\stnh_techtree_interactive`
   - Generierte JSON-Dateien werden hier gespeichert

## Konfiguration

Alle Pfade werden in `config.py` konfiguriert. Bei Änderungen der Repository-Pfade:

```python
# config.py editieren:
STNH_MOD_ROOT = r"C:\Users\marcj\git01\New-Horizons-Development"
TECHTREE_PROJECT_ROOT = r"C:\Users\marcj\git09\stnh_techtree_interactive"
```

**Konfiguration testen:**
```bash
python config.py
```

## Voraussetzungen

```bash
pip install ply
```

## Schnellstart

```bash
# 1. Konfiguration testen
python config.py

# 2. Trigger-Map erstellen (falls neue Species)
python create_trigger_map.py

# 3. Localization aktualisieren
python parse_localisation.py

# 4. Tech-JSONs generieren
python create_tech_json.py
```

## Detaillierte Anleitung

Siehe [../docs/DATA_UPDATE_WORKFLOW.md](../docs/DATA_UPDATE_WORKFLOW.md) für den kompletten Workflow!

## Skripte

### Haupt-Skripte

#### `create_tech_json.py` (6.9 KB)
Generiert die drei Technologie-JSON-Dateien aus den STNH Mod-Dateien.

**Output:**
- `assets/technology_physics.json`
- `assets/technology_engineering.json`
- `assets/technology_society.json`

**Verwendung:**
```bash
python create_tech_json.py
```

#### `parse_localisation.py` (1.5 KB)
Parst die Localization-YAML-Dateien und erstellt die Tech-ID → Name Mapping-Datei.

**Input:** `localisation/english/*_l_english.yml`
**Output:** `localisation_map.json`

**Verwendung:**
```bash
python parse_localisation.py
```

#### `create_trigger_map.py` (2.2 KB)
Erstellt die hardcodierte Zuordnung von Game-Conditions zu Species.

**Output:** `trigger_map.json`

**Hinweis:** Muss manuell gepflegt werden, wenn neue Species zur Mod hinzugefügt werden!

**Verwendung:**
```bash
python create_trigger_map.py
```

### Hilfs-Skripte

#### `parse.py` (15 KB)
Haupt-Parser für Stellaris-Dateien. Verwendet PLY (Python Lex-Yacc) zum Parsen der Stellaris-Syntax.

**Abhängigkeiten:** `lex.py`, PLY

#### `lex.py` (1.7 KB)
Lexical Analyzer für Stellaris-Script-Dateien. Tokenisiert Barewords, Strings, Variablen, Zahlen, etc.

### Analyse-Skripte (Optional)

#### `extract_potentials.py` (2.1 KB)
Extrahiert `potential = {...}` Blöcke aus Tech-Dateien.

**Output:** `archive/potentials.json`

**Hinweis:** Derzeit nicht aktiv in der Web-App genutzt, nur für Analyse-Zwecke.

#### `analyze_potentials.py` (2.2 KB)
Analysiert und kategorisiert die extrahierten Potential-Conditions.

**Output:** `archive/potentials_analysis.json`

## Workflow: Daten-Update nach Mod-Änderung

1. **Localization aktualisieren:**
   ```bash
   python parse_localisation.py
   ```

2. **Trigger-Map prüfen/aktualisieren:**
   ```bash
   python create_trigger_map.py
   ```
   Falls neue Species hinzugekommen sind, muss das Skript angepasst werden!

3. **Technologie-JSONs generieren:**
   ```bash
   python create_tech_json.py
   ```

4. **Testen:**
   ```bash
   cd ..
   python -m http.server 8000
   # Browser öffnen: http://localhost:8000
   ```

5. **Committen:**
   ```bash
   git add assets/*.json localisation_map.json trigger_map.json
   git commit -m "[Data] Update tech data to STNH v2.x.x"
   git push origin main
   ```

## Fehlerbehebung

**Problem: ModuleNotFoundError: No module named 'ply'**
- Lösung: `pip install ply`

**Problem: FileNotFoundError bei Mod-Dateien**
- Lösung: Pfade in den Skripten anpassen (hardcodierte Pfade zu STNH Mod-Verzeichnis)

**Problem: Neue Species werden nicht erkannt**
- Lösung: `create_trigger_map.py` aktualisieren mit neuen Species-Mappings

## Weitere Informationen

Für detaillierte Informationen zum gesamten Entwicklungs-Workflow siehe:
- [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- [../docs/FILE_STRUCTURE.md](../docs/FILE_STRUCTURE.md)
