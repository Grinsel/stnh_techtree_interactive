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
- **Tech Details Panel**: A details tab in the sidebar for clicked technologies with richer information than the tooltip.
- **Shareable Links**: Generate a unique URL that saves your current filters, layout, and focused technology or even a calculated path to share your exact view.
- **History Navigation**: Use back and forward buttons to navigate through your viewing history, similar to a web browser.
- **Path & Dependency Analysis**: Right-click to select a start and end technology, then render the direct path or all prerequisites in a separate, focused view.
- **Visual Tier Indicators**: Each technology node visually displays its tier level with stripes for quick identification.
- **Multiple Layouts**: Choose between different force-directed graph layouts, including one with arrows to clearly indicate dependency direction.
- **Save State**: Your filter and layout settings are automatically saved in your browser for your next visit.
- **Refined Initial View**: Improvements to the initial presentation of the tree when it first loads.
- **Zoom & Pan with LOD**: Smooth zoom/pan with adaptive level-of-detail for performance on large views.
- **Parent/Child Toggle**: Switched over to the new "Path & Dependency Analysis" feature to show selected tech dependencies in a new render window.
- **Technology Icons**: Each technology displays its unique icon from the game files (WebP format for fast loading).
- **Unlock Indicators**: Small icons in each tech node show what the technology unlocks (buildings, ships, components, etc.) using original Stellaris icons.

## 📌 Planned Features / Roadmap

The following improvements and new features are planned:

- **Rarity Filter**: A filter to distinguish between rare, common, and other technology rarities.



## 🛠 Technologies Used

- HTML/CSS/JavaScript
- D3.js for graph rendering
- Data parsed from STNH mod files (techtree format)

## 📬 Feedback

Feedback is currently collected via the closed beta forum. Please tag `@Grinsel` in your report. Public issue reporting will be enabled once the tool is more stable.
