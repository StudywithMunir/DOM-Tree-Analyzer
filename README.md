# Enhanced DOM Tree Visualizer

A powerful, interactive tool to visualize, inspect, and analyze the DOM structure of any web page. Open a popup window with a beautiful, feature-rich DOM explorer, complete with search, filtering, live editing, accessibility checks, event listener viewing, and more.

---

## 🚀 How to Use

1. **Add the Script to Your Page**
   - Open your browser's DevTools (F12), go to the Console tab.
   - Paste the contents of `dom-tree-visualizer.js` and press Enter.
   - A popup window will open with the DOM Tree Visualizer.
   - **Note:** Allow popups for the site if blocked.

2. **Explore the DOM Tree**
   - The left panel shows the DOM as a collapsible tree.
   - Click nodes to expand/collapse children.
   - Hover nodes to highlight them in the tree and the original page.
   - Use the breadcrumb at the top to navigate up the tree.

3. **Toolbar Features**
   - **Expand All / Collapse All:** Expand or collapse all nodes.
   - **Collapse to Level:** Collapse the tree to a specific depth.
   - **Show Text Nodes:** Toggle visibility of text nodes.
   - **Export JSON/HTML:** Download the DOM as JSON or HTML.
   - **Inspect Element:** Click to enter inspect mode, then select an element on the original page to jump to it in the tree.
   - **Theme Toggle:** Switch between dark and light themes.

4. **Search & Filter**
   - Use the search box to find nodes by tag, attribute, or text.
   - Use the filter bar to filter by tag, id, class, or attribute (e.g., `data-role=button`).
   - Click "Clear" to reset filters.

5. **Node Actions**
   - Click the dropdown (⋮) on any node for quick actions:
     - **Copy Selector:** Copy a CSS selector for the node.
     - **Copy XPath:** Copy the XPath for the node.
     - **Edit:** Live-edit attributes or text content (click "Done" to save).

6. **Accessibility & Event Listeners**
   - Nodes with accessibility issues show a ⚠️ icon (hover for details).
   - Nodes with event listeners show a 🦾 icon (hover for event types/counts).

7. **Chart View**
   - The right panel shows a D3.js-based tree chart of the DOM structure.
   - Pan/zoom with your mouse. Hover nodes for details.

---

## 💡 Tips & Tricks

- **Popup Blocked?**
  - Make sure your browser allows popups for the site.
- **Live Editing:**
  - Use the "Edit" action to change attributes or text. Click "Done" to apply changes and refresh the tree.
- **Inspect Mode:**
  - Click "Inspect Element" in the toolbar, then click any element on the original page to jump to it in the tree.
- **Exporting:**
  - Use "Export JSON" for a structured representation, or "Export HTML" for the raw HTML.
- **Accessibility:**
  - Look for ⚠️ icons to spot missing `alt` attributes, labels, or ARIA issues.
- **Event Listeners:**
  - 🦾 icon shows attached event listeners (works best in Chrome).
- **Theme:**
  - Toggle between dark and light themes for better readability.
- **Performance:**
  - For very large DOMs, filtering and collapsing can help with performance and navigation.

---

## 🛠️ Requirements
- Modern browser (Chrome recommended for full feature support)
- Popups enabled

---

## 👨‍💻 Credits
**Created by Munir Butt**
