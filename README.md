# STNH Techtree Interactive

This is an interactive visualization of the technology tree for the **Star Trek: New Horizons** mod for Stellaris.

## 🔗 Live Version

You can explore the beta version here:  
[https://grinsel.github.io/stnh_techtree_interactive/](https://grinsel.github.io/stnh_techtree_interactive/)

## 🚧 Beta Test in Progress

We are currently running a closed beta test of this tool. If you are a tester, please refer to the [Beta Test Instructions](./BETA_TEST.md) for guidance and feedback submission.

## 🧭 Features

- Visualizes the full technology tree
- Search for specific technologies and view their dependency subtrees
- Species filtering available in full view (WIP)

## 📌 Planned Features / Roadmap

The following improvements and new features are planned:

- **Improved search** with species-based filtering
- **Minimap** for easier navigation of the full tree without extreme zooming
- **Information panel** for the currently selected technology with detailed data (beyond tooltip)
- **Option to hide isolated technologies** (0 or 1 connections)
- **Tier-level filter** to narrow down the tree by tech tier
- **Rarity filter** to show only rare/common techs
- **Parent/Child toggle** to show/hide entire branches from a selected technology
- **Refined initial view** when the tree first loads
- **Zoom optimization**, with rest of the navigation handled via the minimap
- **Experimental "Start Tech" mode**: select a starting tech and view only its branch (currently limited usefulness)

## 🛠 Technologies Used

- HTML/CSS/JavaScript
- D3.js for graph rendering
- Data parsed from STNH mod files (techtree format)

## 📬 Feedback

Feedback is currently collected via the closed beta forum. Please tag `@Grinsel` in your report. Public issue reporting will be enabled once the tool is more stable.
