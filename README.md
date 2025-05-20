# Enhanced DOM Tree Visualizer

A powerful, interactive tool to visualize, inspect, and analyze the DOM structure of any web page directly within your browser. It opens a feature-rich popup window with a DOM explorer, live editing, accessibility checks, event listener viewing, filtering, and a D3.js-based tree chart.

---

## 🚀 How to Use

1.  **Add the Script to Your Page**
    - Open your browser's Developer Tools (usually by pressing `F12`).
    - Navigate to the `Console` tab.
    - Paste the entire content of the `DOM-Analyzer-Script.js` file into the console and press `Enter`.
    - A new popup window will appear containing the Enhanced DOM Tree Visualizer.
    - **Note:** If the popup is blocked by your browser, please allow popups for the specific site you are analyzing.

2.  **Explore the DOM Tree Structure**
    - The left panel displays the DOM of the current page as a hierarchical, collapsible tree.
    - Click on the `▾` or `▸` toggles next to nodes to expand or collapse their children.
    - Hover your mouse over a node in the tree to highlight it and its corresponding element on the original web page.
    - Use the `breadcrumb` trail at the top of the tree panel to quickly navigate back up the ancestor chain of the currently selected or hovered node.

3.  **Toolbar Features**
    - **Expand All / Collapse All:** Quickly expand or collapse all nodes in the tree.
    - **Collapse to Level:** Select a depth from the dropdown to collapse the tree, showing only nodes up to that level.
    - **Show Text Nodes:** Use the checkbox to toggle the visibility of text nodes in the tree view.
    - **Export JSON/HTML:** Download the current DOM structure as a `.json` file or the raw HTML of the `documentElement` as a `.html` file.
    - **Inspect Element:** Click this button to enable inspect mode. Then, click on any element on the original web page, and the visualizer will automatically scroll the tree view to that element and highlight it.
    - **Theme Toggle:** Switch between the default dark theme and a light theme for the visualizer window.
    - **Full Screen Chart:** Expand the D3.js chart view to fill the entire popup window.

4.  **Search & Filter the Tree**
    - Use the `Search in DOM tree...` input box to find nodes that contain the entered text within their tag, attributes, or text content. Matching nodes will be highlighted.
    - Use the separate filter input boxes (`Tag`, `ID`, `Class`, `Attr=val`) to refine the tree view based on specific criteria. Enter a value (e.g., `div` for tag, `my-id` for ID, `active` for class, `data-state=open` for attribute). Multiple filters are combined with AND logic.
    - Click the `Clear` button next to the filter inputs to reset all filters and show the full tree.

5.  **Node Actions Menu**
    - Click the vertical ellipsis (`⋮`) dropdown icon next to any element node (`<...>` tag) to access quick actions:
      - **Copy Selector:** Copy a simple CSS selector (tag#id.class) for the element to your clipboard.
      - **Copy XPath:** Copy the XPath query string for the element to your clipboard.
      - **Edit:** Enter live editing mode for this specific node. You can then click directly on attribute names, attribute values, or the text content (if it's a single text child) within the tree label to modify them. Click the `Done` button that appears to apply your changes to the actual DOM on the original page and refresh the visualizer tree.

6.  **Accessibility & Event Listeners Indicators**
    - Look for the `⚠️` icon next to element nodes. Hover over it to see a tooltip detailing potential accessibility warnings (e.g., missing `alt` text on images, missing labels on buttons/links).
    - Look for the `🦾` icon next to element nodes. Hover over it to see a tooltip listing the types of event listeners attached to that element and the count for each type (e.g., `click (2), mouseover (1)`). *Note: This feature relies on `window.getEventListeners` which is primarily available in Chrome DevTools and not a standard web API.*

7.  **DOM Structure Chart**
    - The right panel displays a visual representation of the DOM structure using a D3.js tree chart.
    - You can pan and zoom the chart using your mouse.
    - Hovering over nodes in the chart highlights them and their connection paths to ancestors/descendants.

---

## 💡 Tips & Tricks

- **Popup Blocked?** Ensure your browser is configured to allow popups for the website you are inspecting.
- **Live Editing:** Remember to click the `Done` button after making inline edits in the tree label to save changes to the page.
- **Inspect Mode:** A powerful way to quickly locate a specific element from the page within the potentially large tree structure.
- **Exporting:** Useful for saving the DOM structure or content for further analysis or documentation.
- **Accessibility & Event Listeners:** These icons provide quick insights into potential issues or interactive elements without needing to dive into DevTools tabs.
- **Filtering:** Essential for narrowing down the tree view on complex pages to focus on specific types of elements.
- **Chart View:** Provides a different perspective on the overall structure and depth of the DOM compared to the linear tree view.

---

## 🛠️ Requirements
- A modern web browser. Compatibility is best with Chromium-based browsers (like Chrome, Edge) due to the use of `window.getEventListeners` for the event listener feature.
- Popups must be enabled for the target website.

---

## 👨‍💻 Credits
**Created by Munir Butt**

---

*This script is intended for development and debugging purposes.*
