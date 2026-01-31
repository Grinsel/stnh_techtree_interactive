# Performance-Verbesserungen der Tech-Tree-Ansicht

Dokumentation der Performance-Optimierungen, die bei vielen sichtbaren Nodes Lag reduzieren.

## Übersicht

Die Tech-Tree-Ansicht enthält bis zu ~2000 Technologie-Nodes. Bei gefilterten Ansichten können mehrere hundert Nodes gleichzeitig sichtbar sein. Die folgenden Änderungen reduzieren Lag beim Zoomen, Pannen und während der Force-Simulation.

---

## 1. Throttling von Zoom/LOD-Callbacks

**Dateien:** `js/render.js`, `showcase.js`

- Der `onZoom`-Callback wird mit `requestAnimationFrame` gedrosselt: pro Frame wird maximal ein LOD-Update ausgeführt.
- Während schnellem Zoomen/Pannen wird nicht bei jedem Event LOD berechnet, sondern nur einmal pro Frame.
- Die Tier-Layout-Zoom-Handler (`drawTierLines`, `applyLOD`) nutzen dieselbe rAF-Drosselung.

---

## 2. LOD für große Graphen standardmäßig aktiv

**Datei:** `js/render.js` – `updateLOD()`

- **Vorher:** LOD nur bei aktiviertem Performance-Toggle und >200 Nodes.
- **Nachher:** LOD wird bei >150 Nodes unabhängig vom Toggle aktiviert.
- Große Bäume profitieren automatisch von Sichtbarkeits-Culling, ohne dass der Nutzer den Toggle ändern muss.

---

## 3. Reduzierte Tick-Handler-Last

**Dateien:** `js/ui/layouts/force.js`, `js/ui/layouts/disjoint.js`, `js/ui/layouts/arrows.js`

- **LOD-Frequenz:** `applyLOD` wird nur noch alle 15 Ticks statt alle 5 aufgerufen (ca. 4 statt 12 Aufrufe pro Sekunde während der Simulation).
- **Arrows-Layout:** Fehler behoben: `tickCountArrows` wurde doppelt pro Tick inkrementiert; die Stop-Bedingung hat dadurch nicht korrekt gegriffen. Jetzt nur noch ein Inkrement pro Tick.

---

## 4. Weniger synchrone Pre-Ticks beim Start

**Dateien:** `js/ui/layouts/force.js`, `js/ui/layouts/disjoint.js`, `js/ui/layouts/arrows.js`

- Die `preTicks`-Variable wurde definiert, aber nicht genutzt; die Loops liefen immer mit festen Werten.
- **Force/Arrows:** Bei aktiviertem Performance-Modus 15 Pre-Ticks (statt 50), sonst 50.
- **Disjoint:** Bei aktiviertem Performance-Modus 50 Pre-Ticks (statt 200), sonst 200.
- Weniger blockierende Berechnung beim ersten Laden.

---

## 5. Optimierte `updateLOD`-Sichtbarkeitslogik

**Datei:** `js/render.js` – `updateLOD()`

- Sichtbare Node-IDs werden einmal in einem `Set` berechnet:  
  `visibleNodeIds = new Set(nodes.filter(isVisible).map(n => n.id))`
- Statt für jedes Element separat `isVisible(d)` aufzurufen, wird nur noch `visibleNodeIds.has(d?.id)` geprüft.
- Selektoren (`nodeCircles`, `nodeRects`, `linksLayer`) werden wiederverwendet, keine überflüssigen `selectAll`-Aufrufe.

---

## 6. Throttling von Tier-Layout-Zoom

**Datei:** `showcase.js` – `renderTierBasedGraph()`

- `drawTierLines()` und `applyLOD()` werden im Zoom-Handler per `requestAnimationFrame` gedrosselt.
- Vermeidet ständige Neuzeichnung der Tier-Linien beim schnellen Zoomen.

---

## 7. Optimierung von `wrapText`

**Datei:** `js/render.js` – `wrapText()`

- Schätzung der Textbreite über Zeichenlänge (`_estWidth(str) = str.length * 6.5`).
- Wenn die geschätzte Breite unter 95 % der verfügbaren Breite liegt, wird `getComputedTextLength()` übersprungen.
- Weniger Layout-Rechenarbeit bei kurzen Labels.

---

## Geänderte Dateien

| Datei | Änderungen |
|-------|------------|
| `js/render.js` | rAF-Throttling in `createSvgFor`, LOD-Schwellwert, optimierte `updateLOD`, `wrapText`-Optimierung |
| `showcase.js` | rAF-Throttling für Tier-Zoom-Handler |
| `js/ui/layouts/force.js` | LOD alle 15 Ticks, variable Pre-Ticks |
| `js/ui/layouts/disjoint.js` | LOD alle 15 Ticks, variable Pre-Ticks |
| `js/ui/layouts/arrows.js` | Tick-Counter-Bug behoben, LOD alle 15 Ticks, variable Pre-Ticks |

---

## Performance-Toggle

Der Performance-Toggle in der UI steuert weiterhin die Anzahl der Pre-Ticks beim Start (weniger Ticks = schnellerer Start, aber etwas unruhigerer erster Eindruck der Simulation). Die LOD-Aktivierung hängt davon nicht mehr ab.
