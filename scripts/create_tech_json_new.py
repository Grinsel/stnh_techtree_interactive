"""
Enhanced Tech JSON Generator using Balance Center Infrastructure

This script replaces the old regex-based parser with a sophisticated
Balance Center integration that provides:
- Complete modifier parsing
- Faction availability detection
- Localized descriptions
- Faction-specific alternate names
- Detailed unlock information

Phase 1.3 of STNH Techtree Completion Plan
"""

import json
from pathlib import Path
from balance_center_bridge import BalanceCenterBridge
from config import STNH_MOD_ROOT, OUTPUT_ASSETS_DIR, OUTPUT_ROOT_DIR


def transform_tech_to_website_format(tech, faction_mappings, loc_loader):
    """
    Transform Balance Center tech format → Website JSON format

    Args:
        tech: Technology dict from Balance Center
        faction_mappings: Faction availability mappings from FactionDetector
        loc_loader: LocLoader instance for localization

    Returns:
        Enhanced tech dict with all website-required fields
    """
    tech_id = tech.get('name', '')

    # Get localized name (fallback to tech_id if not found)
    localized_name = loc_loader.get(tech_id, tech_id)

    # Basic fields (already present from Balance Center)
    enhanced = {
        'id': tech_id,
        'name': localized_name,  # Use localized name, not tech_id
        'area': tech.get('area', ''),
        'tier': tech.get('tier', 0),
        'cost': tech.get('cost', 0),
        'prerequisites': tech.get('prerequisites', []),
        'weight': tech.get('weight', 0),
    }

    # PHASE 1 ADDITIONS:

    # 1. Description from localization
    description_key = f"{tech_id}_desc"
    description = loc_loader.get(description_key, "")
    enhanced['description'] = description

    # 2. Faction-specific alternate names
    # TODO: Implement extract_alternate_names()
    enhanced['alternate_names'] = extract_alternate_names(tech_id, loc_loader)

    # 3. Modifiers → Display format
    # TODO: Implement parse_modifiers_for_display()
    modifiers = tech.get('modifiers', {})
    enhanced['effects'] = parse_modifiers_for_display(modifiers)

    # 4. Unlock details
    # TODO: Implement extract_unlock_details()
    unlocks = tech.get('unlocks', [])
    enhanced['unlock_details'] = extract_unlock_details(unlocks, loc_loader)

    # 5. Faction availability
    # TODO: Implement determine_faction_availability()
    enhanced['faction_availability'] = determine_faction_availability(tech, faction_mappings)

    # 6. Additional metadata
    enhanced['is_rare'] = tech.get('is_rare', False)
    enhanced['is_dangerous'] = tech.get('is_dangerous', False)
    enhanced['is_reverse_engineerable'] = tech.get('is_reverse_engineerable', True)

    # 7. Categories (if present)
    enhanced['category'] = tech.get('category', [])

    # Keep required_species from old format for backwards compatibility
    # (will be replaced by faction_availability in Phase 2)
    enhanced['required_species'] = tech.get('required_species', [])

    return enhanced


def extract_alternate_names(tech_id, loc_loader):
    """
    Extract faction-specific alternate names for a technology

    STNH mod uses patterns like:
    - Federation: tech_society_fed_marines → "MACO Detachment"
    - Klingon: tech_society_kdf_marines_1 → "Klingon Raiding Techniques"
    - Romulan: tech_society_rom_marines → "Reman Shock Troops"

    This function scans for related tech IDs and maps them to faction names.

    Args:
        tech_id: Base technology identifier
        loc_loader: LocLoader instance

    Returns:
        Dict mapping faction names to alternate tech names
        Example: {"Federation": "MACO Detachment", "Klingon": "Klingon Raiding Techniques"}
    """
    alternate_names = {}

    # Common faction abbreviations in STNH
    faction_prefixes = {
        'fed': 'Federation',
        'kdf': 'Klingon',
        'rom': 'Romulan',
        'car': 'Cardassian',
        'dom': 'Dominion',
        'und': 'Undine',
        'tho': 'Tholian',
        'bre': 'Breen',
        'fer': 'Ferengi',
        'son': "Son'a",
        'hir': 'Hirogen',
        'vot': 'Voth',
        'kre': 'Krenim',
        'vid': 'Vidiian',
        'sul': 'Suliban',
    }

    # Extract base tech pattern (remove faction prefix if present)
    # Example: tech_society_fed_marines → tech_society_*_marines
    base_pattern = tech_id
    for prefix in faction_prefixes.keys():
        pattern = f"_{prefix}_"
        if pattern in tech_id:
            # Found faction-specific tech, extract base pattern
            base_pattern = tech_id.replace(pattern, "_*_")
            break

    # If this IS a faction-specific tech, search for other variants
    if base_pattern != tech_id:
        for prefix, faction_name in faction_prefixes.items():
            variant_id = base_pattern.replace("_*_", f"_{prefix}_")

            # Try exact match first
            variant_name = loc_loader.get(variant_id, "")
            if variant_name:
                alternate_names[faction_name] = variant_name
            else:
                # Try with _1 suffix (common pattern)
                variant_id_1 = variant_id + "_1"
                variant_name = loc_loader.get(variant_id_1, "")
                if variant_name:
                    alternate_names[faction_name] = variant_name

    # Get the "generic" name from current tech_id
    tech_name = loc_loader.get(tech_id, "")

    # If we found alternates, determine which faction this tech belongs to
    if alternate_names and tech_name:
        # Add current tech's name to the appropriate faction
        for prefix, faction_name in faction_prefixes.items():
            if f"_{prefix}_" in tech_id:
                alternate_names[faction_name] = tech_name
                break

    return alternate_names


def parse_modifiers_for_display(modifiers):
    """
    Convert raw modifiers to human-readable display format

    Example:
        Input:  {"ship_speed_mult": 0.1, "country_resource_minerals_mult": 0.15}
        Output: [
            {"type": "modifier", "key": "ship_speed_mult", "value": 0.1, "display": "+10% Ship Speed"},
            {"type": "modifier", "key": "country_resource_minerals_mult", "value": 0.15, "display": "+15% Mineral Income"}
        ]

    Args:
        modifiers: Dict of modifier_key: value pairs (or complex dict with nested structure)

    Returns:
        List of effect dicts with human-readable display strings
    """
    if not modifiers:
        return []

    effects = []

    # Handle both simple dict and complex nested structure
    if isinstance(modifiers, dict):
        for key, value in modifiers.items():
            try:
                # Skip non-numeric values (complex nested structures)
                if not isinstance(value, (int, float)):
                    continue

                # Convert modifier key to display string
                display = format_modifier_display(key, value)

                effects.append({
                    'type': 'modifier',
                    'key': key,
                    'value': value,
                    'display': display
                })
            except Exception as e:
                # Skip modifiers that can't be processed
                continue

    return effects


def format_modifier_display(key, value):
    """
    Format a single modifier into human-readable text

    Args:
        key: Modifier key (e.g., "ship_speed_mult")
        value: Modifier value (e.g., 0.1) - must be numeric

    Returns:
        Human-readable string (e.g., "+10% Ship Speed")
    """
    # Ensure value is numeric
    try:
        value = float(value)
    except (TypeError, ValueError):
        return f"{key}: {value}"

    # Determine if this is a multiplier (_mult) or additive (_add)
    is_mult = key.endswith('_mult')
    is_add = key.endswith('_add')

    # Format value
    if is_mult:
        # Multiplier: 0.1 → +10%
        formatted_value = f"{value * 100:+.0f}%"
    elif is_add:
        # Additive: 1 → +1
        formatted_value = f"{value:+.0f}"
    else:
        # Unknown type, show raw value
        formatted_value = f"{value:+.2f}"

    # Convert key to readable name
    readable_name = humanize_modifier_key(key)

    return f"{formatted_value} {readable_name}"


def humanize_modifier_key(key):
    """
    Convert modifier key to human-readable name

    Examples:
        ship_speed_mult → Ship Speed
        country_resource_minerals_mult → Mineral Income
        army_damage_mult → Army Damage
    """
    # Remove common prefixes
    name = key.replace('country_', '').replace('planet_', '').replace('pop_', '')
    name = name.replace('ship_', '').replace('starbase_', '').replace('army_', '')

    # Remove _mult, _add suffixes
    name = name.replace('_mult', '').replace('_add', '')

    # Special cases for resources
    if 'resource_' in name:
        name = name.replace('resource_', '').replace('_produces', ' Income').replace('_upkeep', ' Upkeep')

    # Replace underscores with spaces and title case
    name = name.replace('_', ' ').title()

    return name


def extract_unlock_details(unlocks, loc_loader):
    """
    Extract detailed unlock information from tech unlocks list

    Args:
        unlocks: List of unlock strings from Balance Center (e.g., ["building_capital_2", "tech_advanced_sensors"])
        loc_loader: LocLoader instance

    Returns:
        Dict with categorized unlocks and description
        Example: {
            "technologies": ["tech_advanced_sensors"],
            "components": ["SENSOR_2"],
            "buildings": ["building_capital_2"],
            "description": "Unlocks Advanced Capital, Advanced Sensors, and Sensor Array II"
        }
    """
    if not unlocks:
        return {
            'technologies': [],
            'components': [],
            'buildings': [],
            'description': ''
        }

    # Categorize unlocks
    technologies = []
    components = []
    buildings = []
    other = []

    for unlock in unlocks:
        if unlock.startswith('tech_'):
            technologies.append(unlock)
        elif unlock.startswith('building_'):
            buildings.append(unlock)
        elif unlock.startswith('COMPONENT_') or unlock.isupper():
            # Component templates are usually ALL_CAPS
            components.append(unlock)
        else:
            other.append(unlock)

    # Generate description
    description_parts = []

    if buildings:
        building_names = [loc_loader.get(b, b) for b in buildings[:3]]  # Max 3 for brevity
        description_parts.append(f"{len(buildings)} building(s)")

    if components:
        description_parts.append(f"{len(components)} component(s)")

    if technologies:
        description_parts.append(f"{len(technologies)} follow-up tech(s)")

    if other:
        description_parts.append(f"{len(other)} other unlock(s)")

    description = "Unlocks: " + ", ".join(description_parts) if description_parts else "No direct unlocks"

    return {
        'technologies': technologies,
        'components': components,
        'buildings': buildings,
        'other': other,
        'description': description
    }


def determine_faction_availability(tech, faction_mappings):
    """
    Determine which factions can access this technology

    Uses Balance Center's FactionDetector to evaluate potential blocks
    and determine faction-specific availability.

    Args:
        tech: Technology dict from Balance Center
        faction_mappings: Faction availability mappings from FactionDetector

    Returns:
        Dict mapping faction names to availability info
        Example: {
            "Federation": {"available": True, "condition": "default"},
            "Borg": {"available": False, "condition": "excluded"},
            "Romulan": {"available": True, "condition": "potential_block"}
        }
    """
    tech_id = tech.get('name', '')

    # Get faction data from mappings if available
    if tech_id in faction_mappings:
        faction_data = faction_mappings[tech_id]

        availability = {}

        # Faction mappings from FactionDetector indicate which factions CAN access
        for faction_name in faction_data.get('factions', []):
            availability[faction_name] = {
                'available': True,
                'condition': faction_data.get('condition', 'detected')
            }

        return availability

    # Default: available to all factions (no restrictions)
    # This will be shown in UI as "Available to all factions"
    return {}


def generate_complete_tech_data():
    """
    Main function to generate complete technology data using Balance Center

    Steps:
    1. Initialize Balance Center Bridge
    2. Extract ALL data (technologies, factions, faction mappings, localizations)
    3. Transform each tech to website format
    4. Split by area (physics, engineering, society)
    5. Generate factions.json
    6. Write all output files
    """
    print("=" * 60)
    print("STNH Techtree - Enhanced Data Generation (Phase 1.3)")
    print("=" * 60)
    print()

    # 1. Initialize Balance Center Bridge
    print("Step 1: Initializing Balance Center Bridge...")
    bridge = BalanceCenterBridge(STNH_MOD_ROOT)
    print()

    # 2. Extract ALL data
    print("Step 2: Extracting data from Balance Center...")
    data = bridge.get_all_technologies_with_metadata()
    print()

    technologies = data['technologies']
    factions = data['factions']
    faction_mappings = data['faction_mappings']

    print(f"  Extracted {len(technologies)} technologies")
    print(f"  Found {len(factions)} factions")
    print()

    # 3. Transform to website format
    print("Step 3: Transforming to website format...")
    techs_enhanced = []

    for i, tech in enumerate(technologies):
        if (i + 1) % 500 == 0:
            print(f"  Processing technology {i+1}/{len(technologies)}...")

        try:
            enhanced = transform_tech_to_website_format(
                tech,
                faction_mappings,
                bridge.loc_loader
            )
            techs_enhanced.append(enhanced)
        except Exception as e:
            tech_id = tech.get('name', 'unknown')
            print(f"  [WARNING] Failed to transform {tech_id}: {e}")
            continue

    print(f"  Successfully transformed {len(techs_enhanced)} technologies")
    print()

    # 4. Split by area
    print("Step 4: Splitting by area...")
    physics = [t for t in techs_enhanced if t['area'] == 'physics']
    engineering = [t for t in techs_enhanced if t['area'] == 'engineering']
    society = [t for t in techs_enhanced if t['area'] == 'society']

    print(f"  Physics: {len(physics)} techs")
    print(f"  Engineering: {len(engineering)} techs")
    print(f"  Society: {len(society)} techs")
    print()

    # 5. Generate factions metadata
    print("Step 5: Generating faction metadata...")
    factions_metadata = generate_factions_metadata(factions, techs_enhanced)
    print(f"  Generated metadata for {len(factions_metadata)} factions")
    print()

    # 6. Write output files
    print("Step 6: Writing output files...")
    output_dir = Path(OUTPUT_ASSETS_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write tech JSONs
    write_json_file(physics, output_dir / 'technology_physics.json')
    write_json_file(engineering, output_dir / 'technology_engineering.json')
    write_json_file(society, output_dir / 'technology_society.json')

    # Write factions.json
    write_json_file(factions_metadata, output_dir / 'factions.json')

    print()
    print("=" * 60)
    print("[SUCCESS] Tech data generation complete!")
    print("=" * 60)
    print()
    print("Output files:")
    print(f"  - {output_dir / 'technology_physics.json'} ({len(physics)} techs)")
    print(f"  - {output_dir / 'technology_engineering.json'} ({len(engineering)} techs)")
    print(f"  - {output_dir / 'technology_society.json'} ({len(society)} techs)")
    print(f"  - {output_dir / 'factions.json'} ({len(factions_metadata)} factions)")
    print()


def generate_factions_metadata(factions, technologies):
    """
    Generate faction metadata including tech counts

    Args:
        factions: List of faction names from FactionDetector
        technologies: List of all enhanced technologies

    Returns:
        List of faction metadata dicts
    """
    # Faction display names and colors (from STNH lore)
    faction_info = {
        'Federation': {
            'name': 'United Federation of Planets',
            'short_name': 'UFP',
            'color': '#0066cc',
            'playable': True
        },
        'Klingon': {
            'name': 'Klingon Empire',
            'short_name': 'KDF',
            'color': '#cc0000',
            'playable': True
        },
        'Romulan': {
            'name': 'Romulan Star Empire',
            'short_name': 'RSE',
            'color': '#00cc66',
            'playable': True
        },
        'Cardassian': {
            'name': 'Cardassian Union',
            'short_name': 'CU',
            'color': '#cc6600',
            'playable': True
        },
        'Dominion': {
            'name': 'The Dominion',
            'short_name': 'DOM',
            'color': '#9966cc',
            'playable': True
        },
        'Borg': {
            'name': 'Borg Collective',
            'short_name': 'BC',
            'color': '#00cc00',
            'playable': True
        },
        'Undine': {
            'name': 'Undine',
            'short_name': 'UND',
            'color': '#cc00cc',
            'playable': True
        },
    }

    metadata = []

    for faction_name in sorted(factions):
        # Count techs available to this faction
        tech_count = sum(
            1 for tech in technologies
            if not tech.get('faction_availability') or  # No restrictions = available to all
               faction_name in tech.get('faction_availability', {})
        )

        # Get faction info or create default
        info = faction_info.get(faction_name, {
            'name': faction_name.replace('_', ' ').title(),
            'short_name': faction_name[:3].upper(),
            'color': '#cccccc',
            'playable': False
        })

        metadata.append({
            'id': faction_name.lower().replace(' ', '_'),
            'name': info['name'],
            'short_name': info['short_name'],
            'color': info['color'],
            'playable': info['playable'],
            'tech_count': tech_count
        })

    return metadata


def write_json_file(data, filepath):
    """
    Write data to JSON file with pretty formatting

    Args:
        data: Data to write (list or dict)
        filepath: Path object for output file
    """
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Calculate file size
    size_kb = filepath.stat().st_size / 1024
    print(f"  [OK] Wrote {filepath.name} ({size_kb:.1f} KB)")


if __name__ == '__main__':
    generate_complete_tech_data()
