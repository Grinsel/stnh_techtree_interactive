# STNH Techtree Interactive

This is an interactive visualization of the technology tree for the **Star Trek: New Horizons** mod for Stellaris.

## 🔗 Live Version

You can explore the beta version here:  
[https://grinsel.github.io/stnh_techtree_interactive/](https://grinsel.github.io/stnh_techtree_interactive/)

## 🚧 Beta Test in Progress

We are currently running a closed beta test of this tool. If you are a tester, please refer to the [Beta Test Instructions](./BETA_TEST.md) for guidance and feedback submission.

## 🧭 Features

- **Full Tree Visualization**: Displays the entire technology tree.
- **Technology Search**: Search for technologies by name.
- **Branch Inspection**: Click on a technology to inspect its specific dependency branch/subtree.
- **Species Filter**: Filter technologies by species (currently most effective in the full tree view).
- **Improved Search**: The search now correctly respects species restrictions.
- **Hide Isolated Techs**: An option to hide technologies with 0 or 1 connection to reduce clutter.
- **Tier-Level Filter**: Filter the tree to show only technologies of specific tiers.
- **Start-Tech View**: Select a starting technology and view only its specific progression path.

## 📌 Planned Features / Roadmap

The following improvements and new features are planned:

- **Minimap**: For better navigation in the full tree view, eliminating the need for endless scrolling.
- **Info Panel**: A detailed panel for clicked technologies with descriptions that go beyond the simple tooltip.
- **Rarity Filter**: A filter to distinguish between rare, common, and other technology rarities.
- **Parent/Child Toggle**: The ability to show or hide entire branches originating from a selected node.
- **Refined Initial View**: Improvements to the initial presentation of the tree when it first loads.
- **Smart Zoom Limit**: A more intelligent zoom limit, with navigation primarily handled via the minimap.

## 🛠 Technologies Used

- HTML/CSS/JavaScript
- D3.js for graph rendering
- Data parsed from STNH mod files (techtree format)

## 📬 Feedback

Feedback is currently collected via the closed beta forum. Please tag `@Grinsel` in your report. Public issue reporting will be enabled once the tool is more stable.
