# STNH Techtree - Browser Test Checkliste (Phase 2 & 3)

## Vorbereitung
- [ ] Browser-Cache leeren (Strg+Shift+R / Cmd+Shift+R)
- [ ] `index.html` öffnen (lokal oder via GitHub Pages)
- [ ] Browser-Konsole öffnen (F12) für Error-Checks

---

## Phase 2: Fraktions-UI

### Faction Dropdown (Grundfunktion)
- [ ] **UFP vorausgewählt:** Bei erstem Laden ist "United Federation of Planets" vorselektiert
- [ ] **Alle Fraktionen vorhanden:** Dropdown zeigt mindestens: Federation, Klingon, Romulan, Cardassian, Dominion, Borg, Undine
- [ ] **Tech-Count wird angezeigt:** Über dem Tree steht z.B. "1853 technologies available"

### Faction Filtering
- [ ] **All Factions:** Auswahl zeigt alle 1991 Techs
- [ ] **Federation:** Zeigt ~1853 Techs (die meisten verfügbar)
- [ ] **Borg:** Zeigt deutlich weniger Techs (Borg-spezifische + gemeinsame)
- [ ] **Klingon:** Cloaking-Techs sind sichtbar (z.B. "Raider Prototype Cloaking")
- [ ] **Tech-Count aktualisiert sich:** Zahl ändert sich beim Fraktions-Wechsel

### Faction-Specific Features
- [ ] **Gold Border für Exklusive Techs:**
  - Borg-Fraktion auswählen
  - Tech "The Solidity of the Cube" (tech_engineering_industry_1253) suchen
  - **Sollte:** Goldenen Border haben (3px, #ffd700)
- [ ] **Faction Badge in Tooltip:**
  - Borg-exklusive Tech anklicken
  - **Sollte:** Zeigen "⭐ Borg-exclusive" in Gold oben im Tooltip
- [ ] **URL-Sharing funktioniert:**
  - Federation auswählen
  - URL kopieren (sollte `?faction=federation` enthalten)
  - In neuem Tab öffnen
  - **Sollte:** Federation ist vorausgewählt

### Faction-Specific Names (falls implementiert)
- [ ] Fraktions-spezifische Tech-Namen werden angezeigt (z.B. Romulan vs. Klingon Cloaking Tech-Namen unterschiedlich)
  - **Note:** Aktuell möglicherweise noch leer, da `alternate_names` oft leer sind

---

## Phase 3: Effect Display & Enhanced Tooltips

### Effect Display
- [ ] **Effekte werden angezeigt:**
  - Tech "Raider Prototype Cloaking" (tech_physics_11283) suchen
  - **Sollte zeigen:**
    - "+7 Cloaking Strength"
    - "+8 Cloaking Strength"
- [ ] **Effekte gruppiert nach Kategorie:**
  - Tech mit vielen Effects öffnen
  - **Sollte:** Kategorien wie "Combat:", "Ships:", "Other:" anzeigen
- [ ] **Icons vorhanden:**
  - ⚔️ für Combat
  - 🚀 für Ships
  - 🔬 für Science
  - 💰 für Economy
  - ⚙️ für Other

### Enhanced Tooltips
- [ ] **Beschreibungen vorhanden:**
  - Tech "The Solidity of the Cube" öffnen
  - **Sollte:** Vollständige Beschreibung zeigen (beginnt mit "The Cube is another simple shape...")
- [ ] **Unlock-Details (teilweise):**
  - Tech "The Solidity of the Cube"
  - **Sollte zeigen:** "Unlocks Ship Type: Cube"
  - **Note:** Nur 39% der Techs haben Unlocks (bekanntes TODO)
- [ ] **Direct Modifiers:**
  - Tech "The Solidity of the Cube"
  - **Sollte zeigen:** "+60 Command Limit" unter Effects/Other
- [ ] **Tooltip-Performance:**
  - Mehrere Techs schnell hintereinander anklicken
  - **Sollte:** Sofort erscheinen, kein Lag (< 50ms)

### Component-Based Effects (Phase 3 Kern)
- [ ] **Keine "Factor"-Werte mehr:**
  - Random 10-20 Techs mit Effects prüfen
  - **Sollte NICHT:** "+1.25 Factor" oder ähnliches zeigen
  - **Sollte:** Echte Game-Modifiers wie "Cloaking Strength", "Ship Speed", etc.
- [ ] **Werte sind differenziert:**
  - Mehrere Cloaking-Techs vergleichen
  - **Sollte:** Unterschiedliche Werte haben (nicht alle identisch)

---

## Regressions-Tests (sicherstellen, dass alles noch funktioniert)

### Core Funktionalität
- [ ] **Tree wird geladen:** Techs erscheinen nach 2-3 Sekunden
- [ ] **Zoom funktioniert:** Mausrad / Trackpad zum Zoomen
- [ ] **Pan funktioniert:** Drag mit Maus zum Verschieben
- [ ] **Search funktioniert:**
  - "cruiser" suchen
  - **Sollte:** Relevante Cruiser-Techs highlighten
- [ ] **Area-Filter funktioniert:**
  - "Physics" auswählen
  - **Sollte:** Nur Physics-Techs zeigen (blau)
- [ ] **Tier-Anzeige:** Weiße Streifen auf linker Seite der Nodes zeigen Tier an

### Legacy Features
- [ ] **Species-Select versteckt:** Altes Species-Dropdown sollte nicht sichtbar sein
- [ ] **required_species Fallback:** Techs mit required_species werden korrekt gefiltert

---

## Performance-Tests

### Load Performance
- [ ] **Initial Load:** < 5 Sekunden bis Tree vollständig sichtbar
- [ ] **Faction Switch:** < 1 Sekunde bis Re-Render abgeschlossen
- [ ] **Search:** < 500ms bis Ergebnisse highlighten

### Memory
- [ ] **Keine Memory Leaks:**
  - Mehrmals zwischen Fraktionen wechseln (10x)
  - Browser Task Manager öffnen (Shift+Esc in Chrome)
  - **Sollte:** Memory-Nutzung stabil bleiben (nicht kontinuierlich steigen)

---

## Bekannte Einschränkungen (als OK akzeptieren)

1. **60.7% der Techs haben keine Unlock-Details** - TODO für später
2. **faction_availability meist leer** - Fallback auf required_species funktioniert
3. **alternate_names oft leer** - STNH nutzt wenig fraktionsspezifische Namen
4. **Keine Icons** - Phase 4 (später)

---

## Kritische Fehler (sofort melden!)

- [ ] **Console Errors:** JavaScript-Fehler in Browser-Konsole
- [ ] **Tree lädt nicht:** Leerer Bildschirm nach 10 Sekunden
- [ ] **Faction-Auswahl crasht:** Beim Wechseln erscheint Fehler
- [ ] **Tooltips leer:** Keine Daten in Tooltips sichtbar
- [ ] **Alle Effekte fehlen:** Keine Tech zeigt Effects

---

## Test-Ergebnis dokumentieren

Nach Test bitte angeben:
- **Welche Tests sind PASSED** ✅
- **Welche Tests sind FAILED** ❌
- **Kritische Fehler gefunden?** (mit Console-Error-Details)
- **Performance akzeptabel?** (subjektiv: fühlt sich flüssig an?)

**Ziel:** 90%+ der Tests sollten passen für erfolgreichen Phase 2 & 3 Abschluss
