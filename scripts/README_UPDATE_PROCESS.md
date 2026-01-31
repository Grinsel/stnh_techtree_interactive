# STNH Techtree Update Process

## Overview

This document describes the complete process for updating the STNH Interactive Techtree after game/mod updates.

---

## Quick Start

```bash
cd scripts/
python UPDATE_TECHTREE.py
```

Then:
1. Run `icons/converter.bat` (if DDS files present)
2. Delete DDS files from `icons/`
3. Test locally
4. Commit and push

---

## Data Sources

### Technology Data
| Source | Path | Description |
|--------|------|-------------|
| STNH Mod | `git01/New-Horizons-Development/common/technology/*.txt` | All tech definitions |
| Balance Center | `git01/New-Horizons-Development/balance_center/` | Parsed tech data |
| Localisation | `git01/New-Horizons-Development/localisation/english/` | Tech names/descriptions |

### Icon Sources (Priority Order)
| Priority | Source | Path |
|----------|--------|------|
| 1 | STNH Mod (technologies) | `git01/.../gfx/interface/icons/technologies/` |
| 2 | STNH Mod (full gfx) | `git01/.../gfx/` (recursive) |
| 3 | Vanilla (technologies) | `Steam/.../Stellaris/gfx/interface/icons/technologies/` |
| 4 | Vanilla (full gfx) | `Steam/.../Stellaris/gfx/` (recursive) |

### Unlock Data Sources
| Source | Path | Pattern |
|--------|------|---------|
| Buildings | `common/buildings/` | `prerequisites = { "tech_xxx" }` |
| Ship Types | `common/ship_sizes/` | `prerequisites = { "tech_xxx" }` |
| Components | `common/component_templates/` | `prerequisites = { "tech_xxx" }` |
| Megastructures | `common/megastructures/` | `prerequisites = { "tech_xxx" }` |
| + 40 more directories | See `reverse_unlock_parser.py` | |

---

## Scripts Reference

### Main Scripts

| Script | Purpose |
|--------|---------|
| `UPDATE_TECHTREE.py` | **Master script** - runs all parsers in order |
| `create_tech_json_new.py` | Generates tech JSON files with all data |
| `extract_icon_mappings.py` | Extracts icon references from tech files |
| `verify_all_icons.py` | Verifies all icons exist, copies missing ones |

### Parser Scripts

| Script | Purpose |
|--------|---------|
| `balance_center_bridge.py` | Bridge to Balance Center data |
| `component_parser.py` | Parses component effects |
| `reverse_unlock_parser.py` | Finds what each tech unlocks |
| `supplemental_tech_parser.py` | Catches techs missed by Balance Center |

### Icon Scripts

| Script | Purpose |
|--------|---------|
| `extract_tech_icons.py` | Initial icon extraction (legacy) |
| `find_missing_icons.py` | Searches mod gfx for missing icons |
| `find_vanilla_icons.py` | Searches vanilla Stellaris for icons |
| `fix_missing_icons.py` | Fixes icons based on mappings |

---

## Output Files

### Technology Data (`assets/`)
| File | Description |
|------|-------------|
| `technology_physics.json` | Physics techs with full data |
| `technology_engineering.json` | Engineering techs with full data |
| `technology_society.json` | Society techs with full data |
| `factions.json` | Faction metadata |

### Icon Data (`icons/`)
| File | Description |
|------|-------------|
| `tech_icon_mappings.json` | tech_id → icon_name mapping |
| `icons_webp/` | Converted WebP icons for web |
| `unfound_icons_report.txt` | Icons that couldn't be found |

---

## Tech JSON Structure

```json
{
  "id": "tech_xxx",
  "name": "Localized Name",
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
    }
  },
  "description": "...",
  "faction_availability": {...}
}
```

---

## Icon Mapping

The `icon` field in tech files can be:
1. **Explicit**: `icon = tech_custom_name`
2. **Default**: If no icon field, uses tech_id as icon name

**Important**: Icon names can contain hyphens! (e.g., `tech_engineering_starship-class_717`)

---

## Known Issues

### Unfindable Icons (3 total)
These icons don't exist in any source:
- `tech_ai_update_dummy_tech` - Dummy/test tech
- `tech_transwarp_test` - Test tech
- `tech_engineering_12202` - Referenced but missing

### Comments in Tech Files
Lines starting with `#` are comments and must be ignored when parsing.

---

## Troubleshooting

### Icons not showing
1. Check browser console for 404 errors
2. Verify icon exists in `icons/icons_webp/`
3. Check `tech_icon_mappings.json` for correct mapping
4. Run `verify_all_icons.py`

### Tech data incorrect
1. Re-run `create_tech_json_new.py`
2. Check Balance Center is up to date
3. Verify localisation files exist

### Performance issues
- Enable Performance Mode checkbox on website
- LOD system hides details at low zoom levels

---

## Version History

- **2024-01**: Initial techtree implementation
- **2024-01**: Added icon support with WebP conversion
- **2024-01**: Fixed hyphen bug in icon names
- **2024-01**: Added comprehensive icon verification
