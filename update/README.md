# STNH Techtree - Update System

Dieses Verzeichnis enthält alle Scripts zur Aktualisierung der Techtree-Daten nach Mod- oder Spielupdates.

---

## Schnellstart

```bash
cd update/
python UPDATE_TECHTREE_FULL.py
```

Danach:
1. `icons/converter.bat` ausführen (falls DDS-Dateien vorhanden)
2. DDS-Dateien aus `icons/` löschen
3. Lokal im Browser testen
4. Änderungen committen und pushen

---

## Ordnerstruktur

```
stnh_techtree_interactive/
├── update/              # <-- Dieses Verzeichnis (Update-Scripts)
│   ├── UPDATE_TECHTREE_FULL.py   # Master-Script mit Logging
│   ├── update_logger.py          # JSON-Logging-Modul
│   ├── config.py                 # Pfad-Konfiguration
│   ├── logs/                     # Update-Logs (JSON)
│   └── ...                       # Parser und Hilfsskripte
│
├── js/                  # Website JavaScript
├── css/                 # Website Styles
├── assets/              # Generierte Tech-Daten (JSON)
├── icons/               # Tech-Icons (WebP)
└── index.html           # Website Hauptseite
```

---

## Update-Phasen

Das Master-Script `UPDATE_TECHTREE_FULL.py` führt 6 Phasen aus:

| Phase | Beschreibung | Scripts |
|-------|--------------|---------|
| 1. Validierung | Pfade und Balance Center prüfen | `config.py` |
| 2. Daten-Caching | Localisation und Trigger-Maps | `parse_localisation.py`, `create_trigger_map.py` |
| 3. Icon-Vorbereitung | Icon-Mappings extrahieren | `extract_icon_mappings.py` |
| 4. Tech-Generierung | JSON-Dateien generieren | `create_tech_json_new.py` |
| 5. Icon-Verifikation | Fehlende Icons finden/kopieren | `verify_all_icons.py` |
| 6. Abschluss | Statistiken, Log speichern | `update_logger.py` |

---

## Script-Übersicht

### Haupt-Scripts

| Script | Beschreibung |
|--------|--------------|
| `UPDATE_TECHTREE_FULL.py` | Master-Script mit vollem Update-Ablauf |
| `update_logger.py` | JSON-Logging für Update-Sessions |
| `config.py` | Zentrale Pfad-Konfiguration |

### Daten-Parser

| Script | Beschreibung |
|--------|--------------|
| `create_tech_json_new.py` | Generiert Tech-JSONs mit allen Daten |
| `balance_center_bridge.py` | Bridge zum Balance Center Parser |
| `component_parser.py` | Extrahiert Komponenten-Effekte |
| `reverse_unlock_parser.py` | Findet was jede Tech freischaltet |
| `ship_name_parser.py` | Extrahiert Fraktions-Schiffsnamen aus ship_sizes |
| `supplemental_tech_parser.py` | Fängt vom Balance Center verpasste Techs |
| `parse_localisation.py` | Cached Lokalisierungsstrings |
| `create_trigger_map.py` | Erstellt Fraktions-Mappings |

### Icon-Scripts

| Script | Beschreibung |
|--------|--------------|
| `extract_icon_mappings.py` | Extrahiert Icon-Referenzen aus Tech-Dateien |
| `verify_all_icons.py` | Verifiziert und kopiert fehlende Icons |
| `find_missing_icons.py` | Sucht im Mod-GFX nach Icons |
| `find_vanilla_icons.py` | Sucht im Vanilla-Stellaris nach Icons |

### Legacy-Scripts (veraltet)

| Script | Status |
|--------|--------|
| `UPDATE_TECHTREE.py` | Deprecated - nutze `UPDATE_TECHTREE_FULL.py` |
| `create_tech_json.py` | Ersetzt durch `create_tech_json_new.py` |
| `parse.py`, `lex.py` | Alte PLY-basierte Parser |

---

## Datenquellen

### Technologie-Daten
| Quelle | Pfad |
|--------|------|
| STNH Mod | `git01/New-Horizons-Development/common/technology/*.txt` |
| Balance Center | `git01/New-Horizons-Development/balance_center/` |
| Lokalisation | `git01/New-Horizons-Development/localisation/english/` |

### Icon-Quellen (Priorität)
| Priorität | Quelle | Pfad |
|-----------|--------|------|
| 1 | STNH Mod (technologies) | `git01/.../gfx/interface/icons/technologies/` |
| 2 | STNH Mod (full gfx) | `git01/.../gfx/` (rekursiv) |
| 3 | Vanilla (technologies) | `Steam/.../Stellaris/gfx/interface/icons/technologies/` |
| 4 | Vanilla (full gfx) | `Steam/.../Stellaris/gfx/` (rekursiv) |

---

## Output-Dateien

### Generierte Daten (`assets/`)
| Datei | Beschreibung |
|-------|--------------|
| `technology_physics.json` | Physics-Techs mit allen Daten |
| `technology_engineering.json` | Engineering-Techs mit allen Daten |
| `technology_society.json` | Society-Techs mit allen Daten |
| `factions.json` | Fraktions-Metadaten |

### Icons (`icons/`)
| Datei/Ordner | Beschreibung |
|--------------|--------------|
| `icons_webp/` | WebP-Icons für die Website |
| `unlock_types/webp/` | Unlock-Typ-Icons (Gebäude, Schiffe, etc.) |
| `tech_icon_mappings.json` | tech_id → icon_name Mapping |

### Logs (`update/logs/`)
| Datei | Beschreibung |
|-------|--------------|
| `update_YYYY-MM-DD_HH-MM-SS.json` | Strukturiertes JSON-Log pro Update |

---

## JSON-Log-Struktur

```json
{
  "session": {
    "start_time": "2024-01-31T14:30:00",
    "end_time": "2024-01-31T14:32:15",
    "duration_seconds": 135,
    "success": true
  },
  "environment": {
    "stnh_mod_path": "C:\\Users\\marcj\\git01\\...",
    "techtree_path": "C:\\Users\\marcj\\git09\\..."
  },
  "phases": [...],
  "statistics": {
    "techs_generated": 1991,
    "icons_found": 1988,
    "icon_coverage_percent": 99.85
  },
  "manual_steps_required": [...],
  "errors": [],
  "warnings": [...]
}
```

---

## Tech-JSON-Struktur

```json
{
  "id": "tech_xxx",
  "name": "Lokalisierter Name",
  "icon": "tech_icon_name",
  "area": "physics|engineering|society",
  "tier": 1-11,
  "cost": 1000,
  "prerequisites": ["tech_yyy"],
  "effects": [...],
  "unlock_details": {
    "unlocks_by_type": {
      "Building": [...],
      "Ship Type": [...],
      "Component": [...]
    },
    "faction_ships": {
      "Cardassian": ["Galor-Class Battleship"],
      "Federation": ["Vengeance-Class"]
    }
  },
  "description": "...",
  "faction_availability": {...}
}
```

---

## Bekannte Probleme

### Nicht auffindbare Icons (3 Stück)
Diese Icons existieren in keiner Quelle:
- `tech_ai_update_dummy_tech` - Dummy/Test-Tech
- `tech_transwarp_test` - Test-Tech
- `tech_engineering_12202` - Referenziert aber nicht vorhanden

### Icon-Namen mit Bindestrichen
Icon-Namen können Bindestriche enthalten (z.B. `tech_engineering_starship-class_717`).
Dies wird korrekt behandelt.

---

## Fehlerbehebung

### Icons werden nicht angezeigt
1. Browser-Konsole auf 404-Fehler prüfen
2. Prüfen ob Icon in `icons/icons_webp/` existiert
3. `tech_icon_mappings.json` auf korrektes Mapping prüfen
4. `verify_all_icons.py` ausführen

### Tech-Daten fehlerhaft
1. `create_tech_json_new.py` neu ausführen
2. Balance Center Aktualität prüfen
3. Lokalisierungsdateien prüfen

### Performance-Probleme
- Performance Mode Checkbox auf Website aktivieren
- LOD-System blendet Details bei niedrigem Zoom aus

---

## Versionshistorie

| Datum | Änderung |
|-------|----------|
| 2024-01 | Initiale Techtree-Implementierung |
| 2024-01 | Icon-Support mit WebP-Konvertierung |
| 2024-01 | Bindestrich-Bug in Icon-Namen behoben |
| 2024-01 | Umfassende Icon-Verifikation hinzugefügt |
| 2026-01 | `UPDATE_TECHTREE_FULL.py` mit JSON-Logging |
| 2026-01 | Unlock-Type Icons (Stellaris Game Icons) |
| 2026-01 | Ordner von `scripts/` zu `update/` umbenannt |
| 2026-02 | `ship_name_parser.py` fuer Fraktions-Schiffsnamen |
| 2026-02 | `faction_ships` Struktur in Tech-JSON fuer fraktionsspezifische Schiffe |
| 2026-02 | JS-Suche durchsucht alle faction_ships, Tooltip filtert nach Fraktion |
