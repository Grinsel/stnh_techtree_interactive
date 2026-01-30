# Archive - Nicht verwendete Legacy-Dateien

Dieses Verzeichnis enthält Dateien, die nicht mehr aktiv in der Web-Anwendung verwendet werden, aber aus Referenzgründen archiviert wurden.

## Enthaltene Dateien

### `potentials.json` (164 KB)
**Ursprünglicher Zweck:** Extracted `potential = {...}` Blöcke aus Technologie-Dateien

**Warum archiviert:**
- Wird nicht in der Web-App verwendet
- Nur für Entwickler-Referenz und Analyse nützlich
- Kann mit `scripts/extract_potentials.py` neu generiert werden

### `potentials_analysis.json` (24 KB)
**Ursprünglicher Zweck:** Statistik und Kategorisierung der Potential-Conditions

**Warum archiviert:**
- Analyse-Output, nicht für Production benötigt
- Kann mit `scripts/analyze_potentials.py` neu generiert werden

### `society.json` (213 KB)
**Ursprünglicher Zweck:** Alternative Society-Tree-Daten (vermutlich altes Format)

**Warum archiviert:**
- Ersetzt durch `assets/technology_society.json`
- Anderes Datenformat
- Nicht kompatibel mit aktuellem System

### `tooltip.js` (0 bytes)
**Ursprünglicher Zweck:** Placeholder für zukünftige Tooltip-Logik

**Warum archiviert:**
- Leere Datei ohne Inhalt
- Tooltip-Funktionalität ist in `render.js` implementiert
- Unnötiger Placeholder

## Wiederherstellung

Falls eine dieser Dateien doch wieder benötigt wird:

```bash
# Zurück ins Root-Verzeichnis verschieben
git mv archive/<dateiname> .

# Commit
git commit -m "Restore <dateiname> from archive"
```

## Löschen

Falls entschieden wird, diese Dateien dauerhaft zu entfernen:

```bash
git rm archive/*
git commit -m "Remove archived legacy files"
```

**Hinweis:** Durch Git-History bleiben die Dateien auch nach Löschung wiederherstellbar!
