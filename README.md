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
- **Species Filter**: Filter technologies by species.
- **Tier-Level Filter**: Filter the tree to show only technologies of specific tiers.
- **Area Filter**: Filter by technology area (Physics, Society, Engineering).
- **Info Panel**: A detailed, draggable panel for clicked technologies with descriptions that go beyond the simple tooltip.
- **Shareable Links**: Generate a unique URL that saves your current filters, layout, and focused technology or even a calculated path to share your exact view.
- **History Navigation**: Use back and forward buttons to navigate through your viewing history, similar to a web browser.
- **Path & Dependency Analysis**: Right-click to select a start and end technology, then render the direct path or all prerequisites in a separate, focused view.
- **Visual Tier Indicators**: Each technology node visually displays its tier level with stripes for quick identification.
- **Multiple Layouts**: Choose between different force-directed graph layouts, including one with arrows to clearly indicate dependency direction.
- **Save State**: Your filter and layout settings are automatically saved in your browser for your next visit.
- **Refined Initial View**: Improvements to the initial presentation of the tree when it first loads.
- **Smart Zoom Limit**: A more intelligent zoom limit, with navigation primarily handled via the minimap.
- **Parent/Child Toggle**: Switched over to the new "Path & Dependency Analysis" feature to show selected tech dependencies in a new render window.

## 📌 Planned Features / Roadmap

The following improvements and new features are planned:

- **Minimap**: For better navigation in the full tree view, eliminating the need for endless scrolling.
- **Rarity Filter**: A filter to distinguish between rare, common, and other technology rarities.



## 🛠 Technologies Used

- HTML/CSS/JavaScript
- D3.js for graph rendering
- Data parsed from STNH mod files (techtree format)

## 📬 Feedback

Feedback is currently collected via the closed beta forum. Please tag `@Grinsel` in your report. Public issue reporting will be enabled once the tool is more stable.
