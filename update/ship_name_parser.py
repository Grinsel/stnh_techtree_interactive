"""
Ship Name Parser for STNH Techtree

Parses ship_sizes files and localization to extract faction-specific ship names
and map them to technologies.

Output: {tech_id: ["Constitution-Class Heavy Cruiser", ...]}
"""

import os
import re
from pathlib import Path

# Import config for paths
try:
    from config import STNH_MOD_ROOT
except ImportError:
    STNH_MOD_ROOT = r"C:\Users\marcj\git01\New-Horizons-Development"


def parse_ship_sizes(ship_sizes_dir):
    """
    Parse ship_sizes files to extract tech prerequisites and component set references.

    Returns:
        dict: {component_key: tech_id}
    """
    tech_to_components = {}

    # Find ALL .txt files in ship_sizes directory
    files = [f for f in os.listdir(ship_sizes_dir) if f.endswith('.txt')]

    print(f"[Ship Parser] Scanning {len(files)} ship_sizes files...")

    for filename in files:
        filepath = os.path.join(ship_sizes_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                content = f.read()
        except Exception as e:
            print(f"  [WARNING] Could not read {filename}: {e}")
            continue

        # Find all ship class blocks
        current_pos = 0
        while True:
            match = re.search(r'^(\w+)\s*=\s*\{', content[current_pos:], re.MULTILINE)
            if not match:
                break

            block_start = current_pos + match.end()

            # Find the matching closing brace (handle nested braces)
            brace_count = 1
            block_end = block_start
            while brace_count > 0 and block_end < len(content):
                if content[block_end] == '{':
                    brace_count += 1
                elif content[block_end] == '}':
                    brace_count -= 1
                block_end += 1

            block_content = content[block_start:block_end]

            # Extract prerequisites
            prereq_match = re.search(r'prerequisites\s*=\s*\{\s*"([^"]+)"', block_content)
            tech_id = prereq_match.group(1) if prereq_match else None

            # Extract required_component_set (first one that starts with required_data_)
            component_matches = re.findall(r'required_component_set\s*=\s*"(required_data_[^"]+)"', block_content)

            if tech_id and component_matches:
                component_set = component_matches[0]
                if tech_id not in tech_to_components:
                    tech_to_components[tech_id] = set()
                tech_to_components[tech_id].add(component_set)

            current_pos = block_end

    ship_count = sum(len(v) for v in tech_to_components.values())
    print(f"[Ship Parser] Found {ship_count} ship classes from ship_sizes")
    return tech_to_components


def parse_component_templates(component_dir):
    """
    Parse component_templates for ship class upgrades with tech prerequisites.

    The STH_unique_data_components.txt file contains ship upgrade components
    with their own tech prerequisites.

    Returns:
        dict: {tech_id: set(component_keys)}
    """
    tech_to_components = {}

    # Main file with ship data components
    data_file = os.path.join(component_dir, "STH_unique_data_components.txt")

    if not os.path.exists(data_file):
        print(f"[Ship Parser] WARNING: {data_file} not found")
        return tech_to_components

    try:
        with open(data_file, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except Exception as e:
        print(f"[Ship Parser] ERROR reading component file: {e}")
        return tech_to_components

    # Find all utility_component_template blocks
    # Pattern: utility_component_template = { key = "required_data_xxx" ... prerequisites = { tech_yyy } }
    current_pos = 0
    component_count = 0

    while True:
        match = re.search(r'utility_component_template\s*=\s*\{', content[current_pos:])
        if not match:
            break

        block_start = current_pos + match.end()

        # Find matching closing brace
        brace_count = 1
        block_end = block_start
        while brace_count > 0 and block_end < len(content):
            if content[block_end] == '{':
                brace_count += 1
            elif content[block_end] == '}':
                brace_count -= 1
            block_end += 1

        block_content = content[block_start:block_end]

        # Extract key (component ID)
        key_match = re.search(r'key\s*=\s*"(required_data_[^"]+)"', block_content)
        # Extract prerequisites
        prereq_match = re.search(r'prerequisites\s*=\s*\{\s*(\w+)\s*\}', block_content)

        if key_match and prereq_match:
            component_key = key_match.group(1)
            tech_id = prereq_match.group(1)

            if tech_id not in tech_to_components:
                tech_to_components[tech_id] = set()
            tech_to_components[tech_id].add(component_key)
            component_count += 1

        current_pos = block_end

    print(f"[Ship Parser] Found {component_count} ship upgrades from component_templates")
    return tech_to_components


def parse_ship_localisation(loc_dir):
    """
    Parse localization files to get display names for ship component sets.

    Returns:
        dict: {component_set_key: display_name}
    """
    loc_data = {}

    # Primary file for ship names
    ship_loc_file = os.path.join(loc_dir, "STH_ships_l_english.yml")

    if not os.path.exists(ship_loc_file):
        print(f"[Ship Parser] WARNING: {ship_loc_file} not found")
        return loc_data

    try:
        with open(ship_loc_file, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except Exception as e:
        print(f"[Ship Parser] ERROR reading localization: {e}")
        return loc_data

    # Find all required_data entries (excluding _DESC entries)
    # Pattern: required_data_xxx:0 "Display Name"
    matches = re.findall(r'(required_data_[^:_]+(?:_[^:_]+)*):0\s+"([^"]+)"', content)

    for key, value in matches:
        # Skip _DESC entries and entries that are just numbers
        if '_DESC' in key:
            continue
        # Skip if value contains formatting codes (descriptions)
        if '§' in value or '\\n' in value:
            continue
        # Skip if value is just a number
        if value.strip().isdigit():
            continue

        loc_data[key] = value

    print(f"[Ship Parser] Found {len(loc_data)} ship name localizations")
    return loc_data


def build_tech_to_ships_mapping(ship_sizes_dir, loc_dir, component_dir=None):
    """
    Build mapping from tech_id to list of ship display names.

    Combines data from:
    1. ship_sizes files (base ship classes)
    2. component_templates (ship class upgrades)

    Returns:
        dict: {tech_id: ["Constitution-Class Heavy Cruiser", ...]}
    """
    # Parse source data
    tech_to_components_sizes = parse_ship_sizes(ship_sizes_dir)
    loc_data = parse_ship_localisation(loc_dir)

    # Parse component templates if directory provided
    tech_to_components_upgrades = {}
    if component_dir:
        tech_to_components_upgrades = parse_component_templates(component_dir)

    # Merge both sources
    tech_to_components = {}
    for tech_id, components in tech_to_components_sizes.items():
        if tech_id not in tech_to_components:
            tech_to_components[tech_id] = set()
        tech_to_components[tech_id].update(components)

    for tech_id, components in tech_to_components_upgrades.items():
        if tech_id not in tech_to_components:
            tech_to_components[tech_id] = set()
        tech_to_components[tech_id].update(components)

    # Build tech -> ship names mapping
    tech_to_ships = {}
    matched_count = 0

    for tech_id, components in tech_to_components.items():
        for component_key in components:
            # Look up display name
            display_name = loc_data.get(component_key)

            if display_name:
                if tech_id not in tech_to_ships:
                    tech_to_ships[tech_id] = []

                # Avoid duplicates
                if display_name not in tech_to_ships[tech_id]:
                    tech_to_ships[tech_id].append(display_name)
                    matched_count += 1

    # Sort ship names for each tech
    for tech_id in tech_to_ships:
        tech_to_ships[tech_id].sort()

    print(f"[Ship Parser] Mapped {matched_count} ship names to {len(tech_to_ships)} technologies")

    # Show some examples
    examples = list(tech_to_ships.items())[:5]
    for tech_id, ships in examples:
        print(f"  {tech_id}: {ships}")

    return tech_to_ships


def get_ship_names_for_tech(tech_id, tech_to_ships_mapping):
    """
    Get list of ship display names for a technology.

    Args:
        tech_id: Technology ID
        tech_to_ships_mapping: Mapping from build_tech_to_ships_mapping()

    Returns:
        list: Ship display names, or empty list if none
    """
    return tech_to_ships_mapping.get(tech_id, [])


# Main function for standalone testing
def main():
    """Test the ship name parser."""
    ship_sizes_dir = os.path.join(STNH_MOD_ROOT, "common", "ship_sizes")
    loc_dir = os.path.join(STNH_MOD_ROOT, "localisation", "english")
    component_dir = os.path.join(STNH_MOD_ROOT, "common", "component_templates")

    print("=" * 60)
    print("STNH Ship Name Parser - Test Run")
    print("=" * 60)
    print()

    mapping = build_tech_to_ships_mapping(ship_sizes_dir, loc_dir, component_dir)

    print()
    print(f"Total: {len(mapping)} techs with ship unlocks")
    print()

    # Count total ships
    total_ships = sum(len(ships) for ships in mapping.values())
    print(f"Total ship names: {total_ships}")

    return mapping


if __name__ == "__main__":
    main()
