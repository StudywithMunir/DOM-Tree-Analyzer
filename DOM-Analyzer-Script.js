(function() {
    // Helper functions
    function escapeHtml(str) {
        return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatAttributes(el) {
        if (!el.attributes) return '';
        return Array.from(el.attributes)
            .map(attr => ` <span class="attr">${escapeHtml(attr.name)}</span>=<span class="val">"${escapeHtml(attr.value)}"</span>`)
            .join('');
    }

    function getNodeStats(node) {
        const stats = { elements: 0, textNodes: 0, depth: 0 };
        
        function countNodes(n, depth) {
            if (n.nodeType === 1) { // Element node
                stats.elements++;
                stats.depth = Math.max(stats.depth, depth);
                Array.from(n.childNodes).forEach(child => countNodes(child, depth + 1));
            } else if (n.nodeType === 3 && n.textContent.trim()) { // Text node
                stats.textNodes++;
            }
        }
        
        countNodes(node, 0);
        return stats;
    }

    // === ADVANCED FEATURE: Show/Hide Text Nodes ===
    let showTextNodes = true;

    // === ADVANCED FEATURE: Custom Filtering ===
    let filterCriteria = { tag: '', id: '', class: '', attr: '' };

    function matchesFilter(node) {
        if (node.nodeType !== 1) return true;
        if (filterCriteria.tag && node.tagName.toLowerCase() !== filterCriteria.tag.toLowerCase()) return false;
        if (filterCriteria.id && node.id !== filterCriteria.id) return false;
        if (filterCriteria.class && !node.classList.contains(filterCriteria.class)) return false;
        if (filterCriteria.attr) {
            let [attr, val] = filterCriteria.attr.split('=');
            if (!node.hasAttribute(attr)) return false;
            if (val && node.getAttribute(attr) !== val) return false;
        }
        return true;
    }

    // === ADVANCED FEATURE: Accessibility Checks ===
    function getA11yWarnings(node) {
        const warnings = [];
        if (node.nodeType !== 1) return warnings;
        if (node.tagName === 'IMG' && !node.hasAttribute('alt')) warnings.push('Missing alt attribute');
        if ((node.tagName === 'BUTTON' || node.tagName === 'A') && !node.textContent.trim() && !node.hasAttribute('aria-label')) warnings.push('Missing label');
        if (node.hasAttribute('role') && !node.hasAttribute('aria-label')) warnings.push('Missing aria-label for role');
        return warnings;
    }

    // === ADVANCED FEATURE: Event Listener Viewer ===
    function getEventListenersSafe(node) {
        // Chrome only: window.getEventListeners
        try {
            if (typeof window.getEventListeners === 'function') {
                return window.getEventListeners(node);
            }
        } catch {}
        return null;
    }

    // === ADVANCED FEATURE: Live Editing ===
    let isEditing = false;
    function makeEditable(label, node) {
        if (node.nodeType !== 1) return;
        isEditing = true;
        showDoneButton(label, node);
        // Edit attributes
        Array.from(label.querySelectorAll('.attr')).forEach(attrSpan => {
            attrSpan.contentEditable = true;
            attrSpan.style.background = '#2228';
            attrSpan.addEventListener('blur', function () {
                const oldName = attrSpan.getAttribute('data-name');
                const newName = attrSpan.textContent.trim();
                if (newName && newName !== oldName) {
                    const value = node.getAttribute(oldName);
                    node.removeAttribute(oldName);
                    node.setAttribute(newName, value);
                    attrSpan.setAttribute('data-name', newName);
                }
                autoRefreshTree();
            }, { once: true });
        });

        Array.from(label.querySelectorAll('.val')).forEach(valSpan => {
            valSpan.contentEditable = true;
            valSpan.style.background = '#2228';
            valSpan.addEventListener('blur', function () {
                const attrName = valSpan.getAttribute('data-name');
                node.setAttribute(attrName, valSpan.textContent.replace(/"/g, ''));
                autoRefreshTree();
            }, { once: true });
        });

        // Edit text content (for single text node children)
        if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
            const textSpan = label.querySelector('.text');
            if (textSpan) {
                textSpan.contentEditable = true;
                textSpan.style.background = '#2228';
                textSpan.addEventListener('blur', function () {
                    node.childNodes[0].textContent = textSpan.textContent.replace(/"/g, '');
                    autoRefreshTree();
                }, { once: true });
            }
        }
    }

    function showDoneButton(label, node) {
        let doneBtn = document.getElementById('dtv-done-btn');
        if (!doneBtn) {
            doneBtn = document.createElement('button');
            doneBtn.id = 'dtv-done-btn';
            doneBtn.textContent = 'Done';
            doneBtn.style.marginLeft = '10px';
            doneBtn.style.background = '#a6e3a1';
            doneBtn.style.color = '#222';
            doneBtn.style.border = 'none';
            doneBtn.style.borderRadius = '4px';
            doneBtn.style.padding = '2px 10px';
            doneBtn.style.cursor = 'pointer';
            doneBtn.style.fontWeight = 'bold';
            doneBtn.addEventListener('click', function() {
                isEditing = false;
                autoRefreshTree();
            });
        }
        // Remove any existing done button first
        Array.from(label.parentNode.querySelectorAll('#dtv-done-btn')).forEach(btn => btn.remove());
        label.appendChild(doneBtn);
    }

    function autoRefreshTree() {
        if (!isEditing) return;
        setTimeout(() => {
            isEditing = false;
            renderTree();
            renderChart();
        }, 100);
    }

    function renderTree() {
        const treeContainer = popup.document.getElementById('tree');
        if (!treeContainer) {
            // Optionally: console.warn('Tree container not found');
            return;
        }
        treeContainer.innerHTML = '';
        treeContainer.appendChild(buildTree(rootNode));
        // After rendering the tree, re-populate the collapse-depth dropdown
        const stats = getNodeStats(rootNode);
        const depthSelect = popup.document.getElementById('collapse-depth');
        if (depthSelect) {
            depthSelect.innerHTML = '<option value="0">Collapse to Level...</option>';
            for (let i = 1; i <= stats.depth; i++) {
                depthSelect.innerHTML += `<option value="${i}">Level ${i}</option>`;
            }
        }
        updateStats();
        // After rendering, re-attach event listeners
        setupEventListeners();
    }

    function buildTree(node, depth = 0, path = '0') {
        if (!matchesFilter(node)) return document.createDocumentFragment();
        const container = document.createElement('div');
        container.className = 'tree-node';
        container.dataset.path = path;
        container.dataset.depth = depth;

        const label = document.createElement('div');
        label.className = 'tree-label';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '6px';

        if (node.nodeType === 1) { // Element node
            const hasChildren = Array.from(node.childNodes).some(n => 
                n.nodeType === 1 || (showTextNodes && n.nodeType === 3 && n.textContent.trim())
            );
            const id = node.id ? `#${node.id}` : '';
            const classList = Array.from(node.classList).map(c => `.${c}`).join('');

            // Tag
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = `<${node.tagName.toLowerCase()}`;
            label.appendChild(document.createElement('span')).outerHTML = '<span class="toggle">' + (hasChildren ? '▾' : '·') + '</span>';
            label.appendChild(tagSpan);

            // Attributes
            if (node.attributes && node.attributes.length > 0) {
                Array.from(node.attributes).forEach(attr => {
                    const attrSpan = document.createElement('span');
                    attrSpan.className = 'attr';
                    attrSpan.textContent = ' ' + attr.name;
                    attrSpan.setAttribute('data-name', attr.name);
                    label.appendChild(attrSpan);
                    const eq = document.createElement('span');
                    eq.textContent = '=';
                    label.appendChild(eq);
                    const valSpan = document.createElement('span');
                    valSpan.className = 'val';
                    valSpan.textContent = '"' + attr.value + '"';
                    valSpan.setAttribute('data-name', attr.name);
                    label.appendChild(valSpan);
                });
            }
            // Tag close
            const closeTag = document.createElement('span');
            closeTag.className = 'tag';
            closeTag.textContent = '>';
            label.appendChild(closeTag);

            // Selector
            if (id || classList) {
                const selSpan = document.createElement('span');
                selSpan.className = 'selector';
                selSpan.textContent = `${id}${classList}`;
                label.appendChild(selSpan);
                label.title = `Selector: ${node.tagName.toLowerCase()}${id}${classList}`;
            }

            // Dimensions
            if (node.getBoundingClientRect) {
                const rect = node.getBoundingClientRect();
                if (rect.width || rect.height) {
                    const dimensions = document.createElement('span');
                    dimensions.className = 'dimensions';
                    dimensions.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
                    label.appendChild(dimensions);
                }
            }

            // Accessibility warnings
            const a11y = getA11yWarnings(node);
            if (a11y.length) {
                const warn = document.createElement('span');
                warn.className = 'a11y-warning';
                warn.title = a11y.join(', ');
                warn.textContent = '⚠️';
                label.appendChild(warn);
            }

            // Event listeners
            const listeners = getEventListenersSafe(node);
            if (listeners && Object.keys(listeners).length) {
                const evIcon = document.createElement('span');
                evIcon.className = 'event-listener-icon';
                evIcon.title = Object.keys(listeners).map(type => `${type} (${listeners[type].length})`).join(', ');
                evIcon.textContent = '🦾';
                label.appendChild(evIcon);
            }

            // Dropdown for Copy Selector/XPath
            const dropdown = document.createElement('select');
            dropdown.className = 'node-actions';
            dropdown.innerHTML = `
                <option value="">⋮</option>
                <option value="copy-selector">Copy Selector</option>
                <option value="copy-xpath">Copy XPath</option>
                <option value="edit">Edit</option>
            `;
            label.appendChild(dropdown);

            // If element has a single text child, render as editable .text span
            const textChildren = Array.from(node.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim());
            if (textChildren.length === 1) {
                const textSpan = document.createElement('span');
                textSpan.className = 'text';
                let text = textChildren[0].textContent.trim();
                textSpan.textContent = '"' + (text.length > 50 ? text.substring(0, 47) + '...' : text) + '"';
                textSpan.title = text;
                label.appendChild(textSpan);
            }
        } else if (node.nodeType === 3 && node.textContent.trim() && showTextNodes) { // Text node
            // Instead of innerHTML, use createElement for .text span
            const toggleSpan = document.createElement('span');
            toggleSpan.className = 'toggle';
            toggleSpan.textContent = '·';
            label.appendChild(toggleSpan);
            const textSpan = document.createElement('span');
            textSpan.className = 'text';
            let text = node.textContent.trim();
            textSpan.textContent = '"' + (text.length > 50 ? text.substring(0, 47) + '...' : text) + '"';
            textSpan.title = text;
            label.appendChild(textSpan);
        } else {
            return document.createDocumentFragment();
        }

        container.appendChild(label);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';

        const children = Array.from(node.childNodes).filter(n =>
            n.nodeType === 1 || (showTextNodes && n.nodeType === 3 && n.textContent.trim())
        );

        if (children.length > 0) {
            label.classList.add('has-children');
            children.forEach((child, i) => {
                const childPath = `${path}-${i}`;
                childrenContainer.appendChild(buildTree(child, depth + 1, childPath));
            });
            container.appendChild(childrenContainer);
        }

        return container;
    }

    // Helper to get XPath
    function getXPath(element) {
        if (element.id) return `//*[@id='${element.id}']`;
        const parts = [];
        while (element && element.nodeType === 1) {
            let ix = 0;
            let sib = element.previousSibling;
            while (sib) {
                if (sib.nodeType === 1 && sib.nodeName === element.nodeName) ix++;
                sib = sib.previousSibling;
            }
            parts.unshift(element.nodeName.toLowerCase() + (ix ? `[${ix + 1}]` : ''));
            element = element.parentNode;
        }
        return '/' + parts.join('/');
    }

    // === ADVANCED FEATURE: Export DOM Tree ===
    function domToJson(node) {
        if (node.nodeType === 1) {
            return {
                tag: node.tagName.toLowerCase(),
                attrs: node.attributes ? Array.from(node.attributes).map(a => ({ name: a.name, value: a.value })) : [],
                children: Array.from(node.childNodes).map(domToJson).filter(Boolean)
            };
        } else if (node.nodeType === 3 && node.textContent.trim() && showTextNodes) {
            return { text: node.textContent.trim() };
        }
        return null;
    }

    // === ADVANCED FEATURE: Breadcrumb Navigation ===
    function updateBreadcrumb(path) {
        const breadcrumb = popup.document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        const parts = path.split('-').slice(1); // skip root
        let current = rootNode;
        let selector = '0';
        breadcrumb.innerHTML = '';
        const rootCrumb = popup.document.createElement('span');
        rootCrumb.textContent = 'html';
        rootCrumb.className = 'breadcrumb-item';
        rootCrumb.dataset.path = '0';
        breadcrumb.appendChild(rootCrumb);
        for (const idx of parts) {
            if (!current || !current.childNodes) break;
            selector += '-' + idx;
            current = current.childNodes[parseInt(idx)];
            if (!current) break;
            const crumb = popup.document.createElement('span');
            crumb.textContent = current.nodeType === 1 ? current.tagName.toLowerCase() : 'text';
            crumb.className = 'breadcrumb-item';
            crumb.dataset.path = selector;
            breadcrumb.appendChild(document.createTextNode(' > '));
            breadcrumb.appendChild(crumb);
        }
    }

    // === ADVANCED FEATURE: Highlight in Original Page ===
    function highlightOriginal(path) {
        // Remove old overlay
        const old = document.getElementById('dtv-highlight-overlay');
        if (old) old.remove();
        // Find node
        let node = document.documentElement;
        if (path !== '0') {
            const parts = path.split('-').slice(1);
            for (const idx of parts) {
                node = node.childNodes[parseInt(idx)];
                if (!node) return;
            }
        }
        if (node.nodeType !== 1) return;
        const rect = node.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.id = 'dtv-highlight-overlay';
        overlay.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 999999;
            border: 2px solid #f38ba8;
            background: rgba(243,139,168,0.15);
            top: ${rect.top + window.scrollY}px;
            left: ${rect.left + window.scrollX}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.remove(); }, 2000);
    }

    // Generate DOM tree
    const rootNode = document.documentElement;
    const stats = getNodeStats(rootNode);
    const domTree = buildTree(rootNode);
    
    // Create popup window
    const popup = window.open('', '_blank', 'width=800,height=600');
    if (!popup) {
        alert('Popup blocked. Please allow popups to use the DOM Tree Visualizer.');
        return;
    }

    // Add a message listener to the main window to handle copy requests from the popup
    window.addEventListener('message', function(event) {
        // Check if the message is from the expected origin and has the correct format
        console.log('Main window received message:', event.data);
        if (event.source === popup && event.data && event.data.command === 'copyToClipboard') {
            console.log('Main window received copy request:', event.data.text);
            try {
                navigator.clipboard.writeText(event.data.text).then(function() {
                    console.log('Copy successful!');
                    // Optionally send a success message back to the popup
                    // popup.postMessage({ command: 'copyStatus', success: true }, '*');
                }).catch(function(err) {
                    console.error('Failed to copy:', err);
                    // Optionally send an error message back to the popup
                    // popup.postMessage({ command: 'copyStatus', success: false, error: err.message }, '*');
                });
            } catch (err) {
                 console.error('Clipboard API not available or permission denied:', err);
                 // Fallback or inform user
            }
        }
    });

    // Write popup content
    popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Enhanced DOM Tree Visualizer</title>
            <script src="https://d3js.org/d3.v7.min.js"></script>
            <style>
                :root {
                    --bg-color: #1e1e2e;
                    --text-color: #cdd6f4;
                    --accent-color: #89b4fa;
                    --hover-bg: #313244;
                    --border-color: #45475a;
                    --tag-color: #74c7ec;
                    --attr-color: #f9e2af;
                    --value-color: #a6e3a1;
                    --text-node-color: #f5c2e7;
                    --toggle-color: #fab387;
                    --selector-color: #94e2d5;
                    --match-color: #f38ba8;
                    --tree-line-color: #585b70;
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
                    background: var(--bg-color);
                    color: var(--text-color);
                    line-height: 1.6;
                    font-size: 14px;
                    height: 100vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                header {
                    padding: 15px;
                    border-bottom: 1px solid var(--border-color);
                    background: rgba(30, 30, 46, 0.8);
                    backdrop-filter: blur(8px);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                h1 {
                    font-size: 18px;
                    color: var(--accent-color);
                    margin-bottom: 10px;
                }
                .toolbar {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .toolbar-group {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .toolbar-group .toggle-text-nodes {
                    margin-left: 10px;
                }
                .toolbar-group:not(:last-child) {
                    margin-right: 15px;
                    padding-right: 15px;
                    border-right: 1px solid var(--border-color);
                }
                button {
                    background: #585b70;
                    color: var(--text-color);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                button:hover { background: #6c7086; }
                button.active {
                    background: var(--accent-color);
                    color: #1e1e2e;
                }
                select {
                    background: #585b70;
                    color: var(--text-color);
                    border: none;
                    padding: 5px 8px;
                    border-radius: 4px;
                    font-family: inherit;
                    font-size: 12px;
                }
                .search-box {
                    position: relative;
                    flex-grow: 1;
                    max-width: 300px;
                }
                #search-input {
                    width: 100%;
                    padding: 6px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: #313244;
                    color: var(--text-color);
                    font-family: inherit;
                    font-size: 12px;
                }
                #search-results {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    background: #313244;
                    border: 1px solid var(--border-color);
                    border-top: none;
                    border-radius: 0 0 4px 4px;
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s;
                    z-index: 100;
                }
                #search-input:focus + #search-results,
                #search-results:hover {
                    max-height: 200px;
                }
                .search-summary {
                    padding: 8px 12px;
                    font-size: 12px;
                    color: #cdd6f4;
                }
                .stats {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    font-size: 12px;
                    color: #a6adc8;
                }
                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .stat-value {
                    font-weight: bold;
                    color: var(--accent-color);
                }
                .main-container {
                    display: flex;
                    height: calc(100vh - 120px);
                    overflow: hidden;
                }
                .tree-container {
                    flex: 1;
                    height: 100%;
                    min-height: 0;
                    overflow: auto;
                    padding: 15px;
                }
                .tree-node {
                    position: relative;
                    margin-left: 15px;
                }
                .tree-node::before {
                    content: '';
                    position: absolute;
                    left: -10px;
                    top: 0;
                    width: 1px;
                    height: 100%;
                    background-color: var(--tree-line-color);
                }
                .tree-node:last-child::before { height: 12px; }
                .tree-node::after {
                    content: '';
                    position: absolute;
                    left: -10px;
                    top: 12px;
                    width: 8px;
                    height: 1px;
                    background-color: var(--tree-line-color);
                }
                .tree-label {
                    display: flex;
                    align-items: center;
                    padding: 3px 5px;
                    border-radius: 3px;
                    position: relative;
                    white-space: nowrap;
                    gap: 6px; /* Add spacing between inline elements */
                }
                .tree-label > span, .tree-label > button {
                    margin-right: 4px;
                }
                .tree-label > button.copy-selector-btn {
                    font-size: 10px;
                    padding: 2px 6px;
                    background: var(--accent-color);
                    color: var(--bg-color);
                    border-radius: 3px;
                    border: none;
                    cursor: pointer;
                    margin-left: 8px;
                }
                .tree-label > button.copy-selector-btn:active {
                    background: var(--selector-color);
                }
                .tree-label:hover { background-color: var(--hover-bg); }
                .tree-label.highlight { background-color: rgba(137, 180, 250, 0.15); }
                .tree-label.inspected {
                    background-color: rgba(243, 139, 168, 0.3);
                    animation: pulse 1s;
                }
                .tree-label.search-match { background-color: rgba(243, 139, 168, 0.2); }
                .tree-label.search-match .tag,
                .tree-label.search-match .attr,
                .tree-label.search-match .val,
                .tree-label.search-match .text {
                    color: var(--match-color);
                }
                .tree-children {
                    margin-left: 10px;
                    transition: all 0.2s;
                }
                .tree-children.collapsed { display: none; }
                .toggle {
                    display: inline-block;
                    width: 12px;
                    text-align: center;
                    margin-right: 5px;
                    color: var(--toggle-color);
                    font-weight: bold;
                    cursor: pointer;
                    user-select: none;
                }
                .tag { color: var(--tag-color); }
                .attr { color: var(--attr-color); }
                .val { color: var(--value-color); }
                .text {
                    color: var(--text-node-color);
                    font-style: italic;
                }
                .selector {
                    color: var(--selector-color);
                    margin-left: 5px;
                }
                .dimensions {
                    margin-left: 8px;
                    color: #a6adc8;
                    font-size: 0.85em;
                    opacity: 0.7;
                }
                @keyframes pulse {
                    0% { background-color: rgba(243, 139, 168, 0.3); }
                    50% { background-color: rgba(243, 139, 168, 0.6); }
                    100% { background-color: rgba(243, 139, 168, 0.3); }
                }
                footer {
                    padding: 10px 15px;
                    font-size: 12px;
                    color: #a6adc8;
                    text-align: center;
                    border-top: 1px solid var(--border-color);
                }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: #1e1e2e; }
                ::-webkit-scrollbar-thumb {
                    background: #585b70;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover { background: #6c7086; }
                .theme-toggle {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    color: var(--accent-color);
                    cursor: pointer;
                    font-size: 14px;
                }
                .dark-theme { /* Dark theme is default */ }
                .light-theme {
                    --bg-color: #f8fafc;
                    --text-color: #334155;
                    --accent-color: #3b82f6;
                    --hover-bg: #e2e8f0;
                    --border-color: #cbd5e1;
                    --tag-color: #0369a1;
                    --attr-color: #9a3412;
                    --value-color: #166534;
                    --text-node-color: #9d174d;
                    --toggle-color: #ea580c;
                    --selector-color: #0f766e;
                    --match-color: #dc2626;
                    --tree-line-color: #cbd5e1;
                }
                .toolbar-group .export-btn {
                    margin-left: 10px;
                    font-size: 12px;
                    padding: 4px 8px;
                }
                #breadcrumb {
                    margin: 8px 0 8px 0;
                    font-size: 13px;
                    color: var(--selector-color);
                    user-select: text;
                    overflow-x: auto;
                    white-space: nowrap;
                }
                .breadcrumb-item {
                    cursor: pointer;
                    text-decoration: underline;
                    margin: 0 2px;
                }
                .node-actions {
                    font-size: 11px;
                    margin-left: 8px;
                    border-radius: 3px;
                    background: var(--hover-bg);
                    color: var(--text-color);
                    border: 1px solid var(--border-color);
                }
                .a11y-warning {
                    color: #f38ba8;
                    margin-left: 4px;
                    font-size: 15px;
                    cursor: help;
                }
                .event-listener-icon {
                    color: #fab387;
                    margin-left: 4px;
                    font-size: 15px;
                    cursor: pointer;
                }
                .filter-bar {
                    margin: 8px 0;
                    display: flex;
                    gap: 8px;
                }
                .filter-bar input {
                    padding: 3px 6px;
                    border-radius: 3px;
                    border: 1px solid var(--border-color);
                    font-size: 12px;
                }
                .tab-bar {
                    display: flex;
                    gap: 8px;
                    margin: 0 0 10px 0;
                }
                .tab-btn {
                    background: #585b70;
                    color: var(--text-color);
                    border: none;
                    padding: 6px 16px;
                    border-radius: 4px 4px 0 0;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                .tab-btn.active {
                    background: var(--accent-color);
                    color: #1e1e2e;
                }
                .tab-content { display: none; }
                .tab-content.active { display: block; }
                #chart {
                    width: 100%;
                    min-height: 500px;
                    max-height: 700px;
                    overflow: auto;
                    background: #232634;
                    border-radius: 8px;
                    margin-top: 40px;
                }
                /* Pixel Art Name Animation */
                .pixel-name {
                    font-family: 'Press Start 2P', 'Courier New', monospace;
                    font-size: 18px;
                    letter-spacing: 4px;
                    color: #f38ba8;
                    text-shadow: 2px 2px 0 #232634, 4px 4px 0 #89b4fa;
                    animation: pixel-glow 2s infinite alternate;
                    margin-bottom: 2px;
                }
                .pixel-credit-label {
                    font-family: 'Press Start 2P', 'Courier New', monospace;
                    font-size: 10px;
                    color: #a6e3a1;
                    letter-spacing: 2px;
                    text-shadow: 1px 1px 0 #232634;
                }
                @keyframes pixel-glow {
                    0% { color: #f38ba8; text-shadow: 2px 2px 0 #232634, 4px 4px 0 #89b4fa; }
                    50% { color: #89b4fa; text-shadow: 2px 2px 0 #232634, 4px 4px 0 #f38ba8; }
                    100% { color: #f38ba8; text-shadow: 2px 2px 0 #232634, 4px 4px 0 #89b4fa; }
                }
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                .chart-faded {
                    opacity: 0.15 !important;
                    filter: blur(1px);
                    pointer-events: none;
                }
                .chart-highlight {
                    opacity: 1 !important;
                    filter: none;
                    stroke: #89b4fa !important;
                    stroke-width: 4 !important;
                }
                .chart-highlight text, .chart-faded text {
                    fill: #cdd6f4 !important;
                    font-weight: normal !important;
                    filter: none !important;
                    opacity: 1 !important;
                }
                .main-container.fullscreen-chart .tree-container#tree {
                    display: none !important;
                }
                .main-container.fullscreen-chart .tree-container#chart {
                    flex: 1 1 100%;
                    width: 100% !important;
                    height: 100vh !important;
                    margin: 0 !important;
                    max-height: none !important;
                    display: block !important;
                }
                .main-container.fullscreen-structure {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    min-height: 0 !important;
                    overflow: hidden !important;
                }
                .main-container.fullscreen-structure .tree-container#tree {
                    flex: 1 1 100%;
                    width: 100% !important;
                    height: 100vh !important;
                    margin: 0 !important;
                    max-height: 100vh !important;
                    display: block !important;
                    overflow: auto !important;
                    position: relative;
                    padding: 0 !important;
                }
                .fullscreen-back-btn {
                    position: absolute;
                    top: 20px;
                    right: 30px;
                    z-index: 9999;
                    background: #89b4fa;
                    color: #232634;
                    border: none;
                    border-radius: 4px;
                    padding: 8px 18px;
                    font-size: 15px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 2px 8px #0002;
                }
                /* Dynamic inspect highlight styles */
                .tree-label.inspected-dynamic {
                    background: rgba(137,180,250,0.18) !important;
                    color: #f38ba8 !important;
                    font-weight: bold;
                }
                .tree-children.collapsed-dynamic {
                    display: none !important;
                }
                .tree-label.inspected-clicked {
                    background: rgba(137,180,250,0.25) !important;
                    outline: 1px dashed #89b4fa;
                    outline-offset: -2px;
                    color: #cdd6f4 !important;
                    font-weight: bold;
                }
            </style>
        </head>
        <body class="dark-theme">
            <header>
                <h1>Enhanced DOM Tree Visualizer</h1>
                <div class="toolbar">
                    <div class="toolbar-group">
                        <button id="expand-all">Expand All</button>
                        <button id="collapse-all">Collapse All</button>
                        <select id="collapse-depth" title="Collapse to Depth">
                            <option value="0">Collapse to Level...</option>
                        </select>
                        <label class="toggle-text-nodes"><input type="checkbox" id="toggle-text-nodes" checked> Show Text Nodes</label>
                        <button class="export-btn" id="export-json">Export JSON</button>
                        <button class="export-btn" id="export-html">Export HTML</button>
                        <button class="export-btn" id="fullscreen-chart">Full Screen Chart</button>
                    </div>
                    <div class="toolbar-group">
                        <button id="inspect-toggle">Inspect Element</button>
                    </div>
                    <div class="search-box">
                        <input type="text" id="search-input" placeholder="Search in DOM tree...">
                        <div id="search-results"></div>
                    </div>
                    <button id="theme-toggle" class="theme-toggle">☀️</button>
                </div>
                <div id="breadcrumb"></div>
                <div class="stats">
                    <div class="stat-item">
                        <span class="stat-label">Elements:</span>
                        <span class="stat-value" id="element-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Text Nodes:</span>
                        <span class="stat-value" id="text-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Depth:</span>
                        <span class="stat-value" id="depth-level">0</span>
                    </div>
                </div>
                <div class="filter-bar">
                    <input id="filter-tag" placeholder="Tag" size="6">
                    <input id="filter-id" placeholder="ID" size="6">
                    <input id="filter-class" placeholder="Class" size="6">
                    <input id="filter-attr" placeholder="Attr=val" size="10">
                    <button id="filter-clear">Clear</button>
                </div>
            </header>
            <div class="main-container">
                <div class="tree-container" id="tree">Loading DOM Tree...</div>
                <div class="tree-container" id="chart" style="margin-top: 40px;"></div>
            </div>
            <footer>
                Enhanced DOM Tree Visualizer | Click nodes to expand/collapse
                <div id="pixel-credit" style="margin-top:12px; display:flex; flex-direction:column; align-items:center;">
                    <div class="pixel-name">MUNIR BUTT</div>
                    <div class="pixel-credit-label">Creator</div>
                </div>
            </footer>
        </body>
        </html>
    `);

    popup.document.close();

    // Add DOM Tree to popup window
    if (popup.document.readyState === 'loading') {
        popup.document.addEventListener('DOMContentLoaded', () => {
            renderTree();
            renderChart();
            setupCopyListeners(popup, popup.d3 || d3); // Pass popup and d3 ref
        });
    } else {
        renderTree();
        renderChart();
        setupCopyListeners(popup, popup.d3 || d3); // Pass popup and d3 ref
    }

    // Update stats (with null checks)
    function updateStats() {
        const stats = getNodeStats(rootNode);
    const elCount = popup.document.getElementById('element-count');
    if (elCount) elCount.textContent = stats.elements;
    const txtCount = popup.document.getElementById('text-count');
    if (txtCount) txtCount.textContent = stats.textNodes;
    const depthLevel = popup.document.getElementById('depth-level');
    if (depthLevel) depthLevel.textContent = stats.depth;
    }
    updateStats();

    // Set up depth selector
    const depthSelect = popup.document.getElementById('collapse-depth');
    depthSelect.innerHTML = '<option value="0">Collapse to Level...</option>';
    for (let i = 1; i <= stats.depth; i++) {
        depthSelect.innerHTML += `<option value="${i}">Level ${i}</option>`;
    }

    // Add event listeners
    function setupEventListeners() {
        const breadcrumb = popup.document.getElementById('breadcrumb');
        const treeContainer = popup.document.getElementById('tree');
        if (!treeContainer) {
            console.warn('Tree container not found in setupEventListeners');
            return;
        }
        // Toggle node expansion
        treeContainer.addEventListener('click', function(e) {
            const toggle = e.target.closest('.toggle');
            if (!toggle) return;
            const label = toggle.closest('.tree-label');
            if (!label || !label.classList.contains('has-children')) return;;
            const node = label.parentNode;
            const children = node.querySelector('.tree-children');
            if (children) {
                const isExpanded = !children.classList.contains('collapsed');
                if (isExpanded) {
                    children.classList.add('collapsed');
                    toggle.textContent = '▸';
                } else {
                    children.classList.remove('collapsed');
                    toggle.textContent = '▾';
                }
            }
        });

        // Breadcrumb navigation
        if (breadcrumb) {
        breadcrumb.addEventListener('click', function(e) {
            const crumb = e.target.closest('.breadcrumb-item');
            if (!crumb) return;
            const path = crumb.dataset.path;
            if (!path) return;
            const nodeLabel = treeContainer.querySelector(`[data-path="${path}"] > .tree-label`);
            if (nodeLabel) {
                nodeLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                nodeLabel.classList.add('inspected');
                setTimeout(() => nodeLabel.classList.remove('inspected'), 1200);;
                updateBreadcrumb(path);
                highlightOriginal(path);
            }
        });
        }

        // Highlight on hover
        treeContainer.addEventListener('mouseover', function(e) {
            const label = e.target.closest('.tree-label');
            if (!label) return;
            const path = label.parentNode.dataset.path;
            const allLabels = treeContainer.querySelectorAll(`[data-path="${path}"] > .tree-label`);
            allLabels.forEach(l => l.classList.add('highlight'));
        });
        treeContainer.addEventListener('mouseout', function(e) {
            const label = e.target.closest('.tree-label');
            if (!label) return;
            treeContainer.querySelectorAll('.highlight').forEach(l => l.classList.remove('highlight'));
        });

        // Highlight in original page when node is clicked
        treeContainer.addEventListener('click', function(e) {
            const label = e.target.closest('.tree-label');
            if (!label) return;
            const path = label.parentNode.dataset.path;
            if (!path) return;
            updateBreadcrumb(path);
            highlightOriginal(path);
        });

        // Expand/collapse all
        const expandAllBtn = popup.document.getElementById('expand-all');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', function() {
            treeContainer.querySelectorAll('.tree-children').forEach(el => {
                el.classList.remove('collapsed');
            });
            treeContainer.querySelectorAll('.has-children .toggle').forEach(el => {
                el.textContent = '▾';
            });
        });
        }
        const collapseAllBtn = popup.document.getElementById('collapse-all');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', function() {
            treeContainer.querySelectorAll('.tree-children').forEach(el => {
                el.classList.add('collapsed');
            });
            treeContainer.querySelectorAll('.has-children .toggle').forEach(el => {
                el.textContent = '▸';
            });
        });
        }
        // Collapse to depth
        const collapseDepth = popup.document.getElementById('collapse-depth');
        if (collapseDepth) {
            collapseDepth.addEventListener('change', function() {
            const depth = parseInt(this.value);
            if (depth === 0) return;
            treeContainer.querySelectorAll('.tree-node').forEach(node => {
                const nodeDepth = parseInt(node.dataset.depth);
                const children = node.querySelector('.tree-children');
                const toggle = node.querySelector('.toggle');
                if (children && nodeDepth >= depth) {
                    children.classList.add('collapsed');
                    if (toggle && toggle.parentNode.classList.contains('has-children')) {
                        toggle.textContent = '▸';
                    }
                } else if (children) {
                    children.classList.remove('collapsed');
                    if (toggle && toggle.parentNode.classList.contains('has-children')) {
                        toggle.textContent = '▾';
                    }
                }
            });
        });
        }

        // Show/hide text nodes
        const toggleTextNodes = popup.document.getElementById('toggle-text-nodes');
        if (toggleTextNodes) {
            toggleTextNodes.addEventListener('change', function() {
            showTextNodes = this.checked;
            treeContainer.innerHTML = '';
            treeContainer.appendChild(buildTree(rootNode));
            updateBreadcrumb('0');
        });
        }

        // Export JSON
        const exportJsonBtn = popup.document.getElementById('export-json');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', function() {
            const json = JSON.stringify(domToJson(rootNode), null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = popup.document.createElement('a');
            a.href = url;
            a.download = 'dom-tree.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);;
        });
        }
        // Export HTML
        const exportHtmlBtn = popup.document.getElementById('export-html');
        if (exportHtmlBtn) {
            exportHtmlBtn.addEventListener('click', function() {
            const html = rootNode.outerHTML;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = popup.document.createElement('a');
            a.href = url;
            a.download = 'dom-tree.html';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);;
        });
        }

        // Full Screen Chart
        const fullscreenChartBtn = popup.document.getElementById('fullscreen-chart');
        if (fullscreenChartBtn) {
            fullscreenChartBtn.addEventListener('click', function() {
                const mainContainer = popup.document.querySelector('.main-container');
                const treeContainer = popup.document.getElementById('tree');
                const chartContainer = popup.document.getElementById('chart');
                let backBtn = popup.document.getElementById('fullscreen-back-btn');

                if (mainContainer.classList.contains('fullscreen-chart')) {
                    // Exit fullscreen
                    mainContainer.classList.remove('fullscreen-chart');
                    fullscreenChartBtn.textContent = 'Full Screen Chart';
                    if (backBtn) backBtn.remove();
                } else {
                    // Enter fullscreen
                    mainContainer.classList.add('fullscreen-chart');
                    fullscreenChartBtn.textContent = 'Exit Full Screen';
                    // Add back button
                    if (!backBtn) {
                        backBtn = popup.document.createElement('button');
                        backBtn.id = 'fullscreen-back-btn';
                        backBtn.textContent = 'Back';
                        backBtn.className = 'fullscreen-back-btn';
                        backBtn.addEventListener('click', function() {
                            fullscreenChartBtn.click(); // Simulate click on fullscreen button to exit
                        });
                        popup.document.body.appendChild(backBtn);;
                    }
                }
            });
        }

        // Search functionality
        const searchInput = popup.document.getElementById('search-input');
        const searchResults = popup.document.getElementById('search-results');
        if (searchInput && searchResults) {
        searchInput.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            searchResults.innerHTML = '';
            if (!term) {
                treeContainer.querySelectorAll('.search-match').forEach(el => 
                    el.classList.remove('search-match')
                );
                return;
            }
            const matches = [];
            treeContainer.querySelectorAll('.tree-label').forEach(label => {
                const text = label.textContent.toLowerCase();
                label.classList.remove('search-match');
                if (text.includes(term)) {
                    label.classList.add('search-match');
                    matches.push(label);
                }
            });
            if (matches.length > 0) {
                const resultText = popup.document.createElement('div');
                resultText.textContent = `Found ${matches.length} match${matches.length > 1 ? 'es' : ''}`;;
                resultText.className = 'search-summary';
                searchResults.appendChild(resultText);
                const firstMatch = matches[0];
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        }
        
        // Inspect element functionality
        let overlay = null;
        let isInspecting = false;
        // Handler functions (defined inside to access overlay, isInspecting)
        const createOverlay = (position) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                border: 2px solid #ff5722;
                background-color: rgba(255, 87, 34, 0.2);
                pointer-events: none;
                z-index: 9999;
                top: ${position.top}px;
                left: ${position.left}px;
                width: ${position.width}px;
                height: ${position.height}px;
                transition: all 0.2s ease;;
            `;
            document.body.appendChild(overlay);
            return overlay;
        };
        const removeOverlay = () => {
            if (overlay) {
                document.body.removeChild(overlay);
                overlay = null;
        }
        };
        const calculateNodePosition = (node) => {
            if (node.nodeType !== 1) return null;
            const rect = node.getBoundingClientRect();
            if (!rect.width && !rect.height) return null;
            return {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
        };
        const findNodePath = (element) => {
            let path = [];
            let current = element;
            while (current && current !== document.documentElement) {
                const parent = current.parentNode;
                if (!parent) break;
                // Use Array.from for direct children to find index safely
                const index = Array.from(parent.children).indexOf(current);
                if (index === -1) { // Handle cases where element is not a direct child (e.g., SVG inner elements)
                     // Fallback: find among all childNodes, less robust but might work for some structures
                     const allChildren = Array.from(parent.childNodes);
                     let tempIndex = -1;
                     for(let i=0; i < allChildren.length; i++) {
                         if (allChildren[i] === current) { tempIndex = i; break; }
                     }
                     index = tempIndex;
                     if (index === -1) break; // Cannot find element among parent's children
                }
                path.unshift(index);
                current = parent;;
            }
            // If path is empty, it means current is document.documentElement (or disconnected node)
            if (path.length === 0 && element === document.documentElement) return '0';;
            if (path.length === 0) return null; // Node not found in tree structure
            return '0-' + path.join('-');
        };
        // Dynamic highlight: only show the hovered node and its ancestors/descendants
        const highlightNodeInTreeDynamic = (path) => {
            if (!isInspecting) return; // Ensure inspect mode is active
            const treeContainer = popup.document.getElementById('tree');
            if (!treeContainer) return;;
            // Remove all previous highlights/collapses
            treeContainer.querySelectorAll('.tree-label, .tree-children').forEach(el => {
                el.classList.remove('inspected-dynamic', 'collapsed-dynamic', 'inspected-clicked'); // Also remove click highlight
            });
            // Find the node label
            const nodeLabel = treeContainer.querySelector(`[data-path="${path}"] > .tree-label`);
            if (!nodeLabel) return;;
            // Highlight the node and its ancestors
            let parent = nodeLabel.parentNode;
            while (parent && parent !== treeContainer) {
                const label = Array.from(parent.children).find(child => child.classList && child.classList.contains('tree-label'));
                if (label) label.classList.add('inspected-dynamic');;
                parent = parent.parentNode.closest('.tree-node');
            }
            nodeLabel.classList.add('inspected-dynamic');
            // Expand ancestors, collapse all other tree-children
            treeContainer.querySelectorAll('.tree-children').forEach(children => {
                children.classList.add('collapsed-dynamic');
            });
            // Uncollapse the path to the node
            let current = nodeLabel.parentNode;
            while (current && current !== treeContainer) {
                const children = Array.from(current.children).find(child => child.classList && child.classList.contains('tree-children'));
                if (children) children.classList.remove('collapsed-dynamic');;
                current = current.parentNode.closest('.tree-node');
            }
            // Uncollapse descendants
            function uncollapseDescendants(node) {
                const children = Array.from(node.children).find(child => child.classList && child.classList.contains('tree-children'));
                if (children) {
                    children.classList.remove('collapsed-dynamic');
                    Array.from(children.children).forEach(childNode => {
                        if (childNode.classList && childNode.classList.contains('tree-node')) {
                            uncollapseDescendants(childNode);;
                        }
                    });
                }
            }
            uncollapseDescendants(nodeLabel.parentNode);
            // Scroll to the node
            nodeLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        // Restore full tree view
        const restoreTreeDynamic = () => {
            const treeContainer = popup.document.getElementById('tree');
            if (!treeContainer) return;;
            treeContainer.querySelectorAll('.tree-label, .tree-children').forEach(el => {
                el.classList.remove('inspected-dynamic', 'collapsed-dynamic', 'inspected-clicked'); // Remove all inspect highlights
            });
            // Ensure all nodes are expanded (remove manual collapse class too)
             treeContainer.querySelectorAll('.tree-children').forEach(el => {
                el.classList.remove('collapsed'); // Remove manual collapse class
                el.classList.remove('collapsed-dynamic');
             });
             treeContainer.querySelectorAll('.has-children .toggle').forEach(el => {
                el.textContent = '▾'; // Update toggle icon
             });
        };
        // Handle mouseover on elements in the main page
        const handleMouseOver = (e) => {
            if (!isInspecting) return; // Ensure inspect mode is active
            // removeOverlay(); // Remove previous overlay
            // const position = calculateNodePosition(e.target);
            // if (position) {
            //     createOverlay(position); // Create new overlay
            // }
            // Live highlight in structure window
            const path = findNodePath(e.target);
            if (path) {
                highlightNodeInTreeDynamic(path);
            } else {
                 // If element is not found in tree (e.g., script tags, comments), restore full tree
                 restoreTreeDynamic();
            }
        };
        // Handle mouseout on elements in the main page
        const handleMouseOut = (e) => {
            if (!isInspecting) return; // Ensure inspect mode is active
            // removeOverlay(); // Keep overlay until click for better usability
             // Optionally, remove highlight in tree if mouse leaves the element quickly without hover effect kicking in fully
             // This might be too flickery, so keeping it off for now.
        };
        // Handle click on element in the main page while inspect mode is active
        const handleClick = (e) => {
            if (!isInspecting) return; // Ensure inspect mode is active
            e.preventDefault(); // Prevent default link/button behavior
            e.stopPropagation(); // Stop event from propagating
            const path = findNodePath(e.target);
            if (path) {
                // Turn off inspect mode UI
                isInspecting = false; // Manually set state
                document.removeEventListener('mouseover', handleMouseOver, true);
                document.removeEventListener('mouseout', handleMouseOut, true);
                document.removeEventListener('click', handleClick, true); // Remove self
                removeOverlay(); // Remove the highlight overlay
                const inspectToggleBtn = popup.document.getElementById('inspect-toggle');
                 if(inspectToggleBtn) { inspectToggleBtn.classList.remove('active'); inspectToggleBtn.textContent = 'Inspect Element';;}
                // Focus on the clicked node in the tree (static highlight)
                focusOnNodeInTree(path);
            } else {
                 // If clicked element not found in tree, just turn off inspect mode
                 const inspectToggleBtn = popup.document.getElementById('inspect-toggle');
                 if(inspectToggleBtn) { inspectToggleBtn.click(); } // Simulate button click to turn off
            }
        };
        // Focus on a specific node (used after click)
        const focusOnNodeInTree = (path) => {
            const treeContainer = popup.document.getElementById('tree');
            if (!treeContainer) return;;
            // Ensure tree is fully expanded and clean of dynamic highlights
            restoreTreeDynamic(); // Removes collapsed-dynamic and inspected-dynamic, also removes manual collapses
            // Find the node label
            const nodeLabel = treeContainer.querySelector(`[data-path="${path}"] > .tree-label`);
            if (!nodeLabel) return;;
            // Add a persistent highlight class
            nodeLabel.classList.add('inspected-clicked');
            // Scroll to the node
                nodeLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        // --- INSPECT TOGGLE BUTTON LOGIC ---
        const inspectToggle = popup.document.getElementById('inspect-toggle');
        if (inspectToggle) {
            inspectToggle.addEventListener('click', function() {
                if (this.classList.contains('active')) {
                    // Turning OFF inspect mode
                    isInspecting = false; // Explicitly set state
                    this.classList.remove('active');
                    this.textContent = 'Inspect Element';
                    document.removeEventListener('mouseover', handleMouseOver, true);
                    document.removeEventListener('mouseout', handleMouseOut, true);
                    document.removeEventListener('click', handleClick, true);
                    removeOverlay(); // Ensure overlay is removed
                    restoreTreeDynamic(); // Restore the full tree view
                } else {
                    // Turning ON inspect mode
                    isInspecting = true; // Explicitly set state
                    this.classList.add('active');
                    this.textContent = 'Cancel Inspect';
                    // Remove any previous click highlight when starting inspect mode
                    const treeContainer = popup.document.getElementById('tree');
                    if (treeContainer) {
                        treeContainer.querySelectorAll('.inspected-clicked').forEach(el => el.classList.remove('inspected-clicked'));
                    }
        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('mouseout', handleMouseOut, true);
        document.addEventListener('click', handleClick, true);
                }
            });
        }
    } // End of setupEventListeners function

    // New function to setup copy listeners from the main window context
    function setupCopyListeners(popupWindow, d3Library) {
        // Tree View Dropdown Copy Listeners
        popupWindow.document.addEventListener('change', function(e) {
            const dropdown = e.target.closest('.node-actions');
            if (!dropdown) return;
            const selectedValue = dropdown.value;
            const label = dropdown.closest('.tree-label');
            const node = label.parentNode;
            let textToCopy = '';

            if (selectedValue === 'copy-selector') {
                const id = node.id ? `#${node.id}` : '';
                const classList = Array.from(node.classList).map(c => `.${c}`).join('');
                textToCopy = '\'' + node.tagName.toLowerCase() + (id || '') + classList + '\'';
            } else if (selectedValue === 'copy-xpath') {
                textToCopy = getXPath(node);
            }

            if (textToCopy) {
                 // Use execCommand for better cross-window compatibility and focus handling
                 const tempInput = document.createElement('textarea');
                 tempInput.value = textToCopy;
                 document.body.appendChild(tempInput);
                 tempInput.select();
                 let success = false;
                 try {
                     success = document.execCommand('copy');
                     console.log('Copy successful (execCommand):', textToCopy);
                     // Provide feedback in the popup UI
                     dropdown.options[0].textContent = 'Copied!';
                     setTimeout(() => { dropdown.options[0].textContent = '⋮'; }, 1200);
                 } catch (err) {
                      console.error('Failed to copy (execCommand):', err);
                     dropdown.options[0].textContent = 'Copy Error!';
                     setTimeout(() => { dropdown.options[0].textContent = '⋮'; }, 1200);
                 } finally {
                     document.body.removeChild(tempInput);
                 }
            }
            dropdown.value = ''; // Reset dropdown
        });

        // Chart Node Click Copy Listener
        // This needs to be attached after the chart is rendered
        // We can add a mutation observer or ensure this runs after renderChart completes
        // For now, let's add it after a timeout, which is less ideal but works for testing
        setTimeout(() => {
            const chartSvg = popupWindow.document.querySelector('#chart svg');
            if (chartSvg) {
                 chartSvg.addEventListener('click', function(e) {
                     const nodeElement = e.target.closest('.node');
                     if (!nodeElement) return;

                     // Find the corresponding data for the clicked chart node
                     // This requires traversing up the DOM from the clicked element to find the data bound by D3
                     let d3Data = null;
                     let currentElement = nodeElement;
                     while(currentElement && currentElement !== chartSvg) {
                          if (currentElement.__data__) {
                              d3Data = currentElement.__data__;
                              break;
                          }
                          currentElement = currentElement.parentElement;
                     }

                     if (d3Data && d3Data.data && d3Data.data.name) {
                        // The name in chart data for elements is already the selector (tag#id.class)
                        // Wrap it in single quotes for pasting into JS
                        const selector = '\'' + d3Data.data.name + '\'';
                        if (selector) {
                             // Use execCommand for better cross-window compatibility and focus handling
                             const tempInput = document.createElement('textarea');
                             tempInput.value = selector;
                             document.body.appendChild(tempInput);
                             tempInput.select();
                             let success = false;
                             try {
                                 success = document.execCommand('copy');
                                 console.log('Chart node copy successful (execCommand):', selector);
                                 // Optional visual feedback on the chart node itself
                                 if (d3Library) {
                                     d3Library.select(nodeElement).select('circle').attr('fill', '#a6e3a1').transition().duration(500).attr('fill', '#89b4fa');
                                 }
                            } catch (err) {
                                console.error('Chart node copy failed (execCommand):', err);
                                 // Optional error feedback
                                  if (d3Library) {
                                      d3Library.select(nodeElement).select('circle').attr('fill', '#f38ba8').transition().duration(500).attr('fill', '#89b4fa');
                                  }
                            } finally {
                                 document.body.removeChild(tempInput);
                            }
                        }
                     }
                 });
            }
        }, 2000); // Adjust timeout if necessary based on chart rendering time

    }

    function removeInspectMode() {
        // Remove any overlay and event listeners
        const overlays = document.querySelectorAll('div[style*="border: 2px solid #ff5722"]');
        overlays.forEach(el => el.parentNode.removeChild(el));
    }
    
    // Set up event listeners once the DOM is ready
    if (popup.document.readyState === 'loading') {
        popup.document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            setupCopyListeners(popup, popup.d3 || d3); // Pass popup and d3 ref
        });
    } else {
        setupEventListeners();
        setupCopyListeners(popup, popup.d3 || d3); // Pass popup and d3 ref
    }

    // Chart View rendering
    function domToChartData(node) {
        if (node.nodeType === 1) {
            return {
                name: node.tagName.toLowerCase() + (node.id ? `#${node.id}` : '') + (typeof node.className === 'string' && node.className ? '.' + node.className.split(' ').join('.') : ''),
                children: Array.from(node.childNodes).map(domToChartData).filter(Boolean)
            };
        } else if (node.nodeType === 3 && node.textContent.trim()) {
            return { name: '"' + node.textContent.trim().slice(0, 30) + '"' };
        }
        return null;
    }

    // Dynamically load D3.js
    function loadD3(callback) {
        if (popup.document.getElementById('d3-script')) {
            callback();
            return;
        }
        const script = popup.document.createElement('script');
        script.id = 'd3-script';
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = callback;
        popup.document.head.appendChild(script);
    }

    function renderChart() {
        const chartDiv = popup.document.getElementById('chart');
        if (!chartDiv || (typeof popup.d3 === 'undefined' && typeof d3 === 'undefined')) {
            // Optionally: console.warn('Chart container or D3 not found');
            return;
        }
        chartDiv.innerHTML = '';
        const d3ref = popup.d3 || d3;
        const data = domToChartData(rootNode);
        const root = d3ref.hierarchy(data);
        // Dynamic spacing based on tree size
        const depth = root.height + 1;
        const breadth = root.leaves().length;
        const nodeHeight = Math.max(60, 600 / depth);
        const nodeWidth = Math.max(200, 1200 / Math.max(2, breadth));
        const treeLayout = d3ref.tree().nodeSize([nodeHeight, nodeWidth]);
        treeLayout(root);
        let maxX = 0, maxY = 0;
        root.each(d => {
            if (d.x > maxX) maxX = d.x;
            if (d.y > maxY) maxY = d.y;
        });
        const width = Math.max(900, maxY + 300);
        const height = Math.max(600, maxX + 120);
        const svg = d3ref.select(chartDiv)
            .append('svg')
            .attr('width', '100%')
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`);

        // Center group
        const g = svg.append('g').attr('transform', `translate(${nodeWidth / 2},${height / 2})`);

        // Apply zoom to the group
        svg.call(d3ref.zoom().on('zoom', function (event) {
                g.attr('transform', event.transform);
            }));

        // Background grid
        svg.append('g')
            .selectAll('line.grid-x')
            .data(d3ref.range(0, width, 100))
            .enter().append('line')
            .attr('class', 'grid-x')
            .attr('x1', d => d).attr('x2', d => d)
            .attr('y1', 0).attr('y2', height)
            .attr('stroke', '#313244')
            .attr('stroke-width', 0.5);
        svg.append('g')
            .selectAll('line.grid-y')
            .data(d3ref.range(0, height, 60))
            .enter().append('line')
            .attr('class', 'grid-y')
            .attr('y1', d => d).attr('y2', d => d)
            .attr('x1', 0).attr('x2', width)
            .attr('stroke', '#313244')
            .attr('stroke-width', 0.5);
        // Links
        const link = g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#89b4fa')
            .attr('stroke-width', 2)
            .attr('d', d3ref.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));
        // Nodes
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`);
        const nodeCircle = node.append('circle')
            .attr('r', 16)
            .attr('fill', '#89b4fa')
            .attr('stroke', '#232634')
            .attr('stroke-width', 2);
        // Multi-line text for node names
        node.append('text')
            .attr('dy', 5)
            .attr('x', 22)
            .attr('fill', '#cdd6f4')
            .style('font-size', '15px')
            .each(function(d) {
                const name = d.data.name;
                const maxLineLen = 16;
                // Split at hyphens, underscores, or word boundaries
                let parts = name.split(/([\-_])/g); // keep delimiters
                let lines = [];
                let current = '';
                for (let i = 0; i < parts.length; i++) {
                    if (current.length + parts[i].length > maxLineLen && current.length > 0) {
                        lines.push(current);
                        current = '';
                    }
                    current += parts[i];
                }
                if (current) lines.push(current);
                // Fallback: if still too long, break
                lines = lines.flatMap(line => {
                    if (line.length <= maxLineLen) return [line];
                    let arr = [];
                    for (let i = 0; i < line.length; i += maxLineLen) {
                        arr.push(line.slice(i, i + maxLineLen));
                    }
                    return arr;
                });
                lines.forEach((line, i) => {
                    d3ref.select(this)
                        .append('tspan')
                        .attr('x', 0)
                        .attr('y', i * 18)
                        .attr('dx', 22)
                        .text(line);
                });
            });
        // Tooltips
        node.append('title').text(d => d.data.name);

        // Add click listener to chart nodes to copy selector
        node.on('click', function(event, d) {
            if (d.data && d.data.name) {
                const selector = d.data.name;
                if (selector && window.opener) {
                     window.opener.postMessage({ command: 'copyToClipboard', text: selector }, '*');
                     // Optionally provide visual feedback in the chart
                     d3ref.select(this).select('circle').attr('fill', '#a6e3a1').transition().duration(500).attr('fill', '#89b4fa');
                }
            }
        });

        // Add visual feedback to tree view dropdown after sending message
        const dropdown = this;
        setTimeout(() => {
             // This assumes the dropdown is the 'this' context, might need adjustment
             // A more robust way would be to pass an identifier and target a specific element
            if (dropdown && dropdown.options && dropdown.options[0]) {
                dropdown.options[0].textContent = 'Copied!';
                 setTimeout(() => { dropdown.options[0].textContent = '⋮'; }, 1200);
            }
        }, 100); // Give a small delay for the message to potentially be processed

        // --- HIGHLIGHT ON HOVER: ancestors/descendants only ---
        node.on('mouseover', function(event, d) {
            // Collect all ancestors and descendants
            const highlightSet = new Set();
            let current = d;
            while (current) {
                highlightSet.add(current);
                current = current.parent;
            }
            function collectDescendants(node) {
                highlightSet.add(node);
                if (node.children) node.children.forEach(collectDescendants);
            }
            collectDescendants(d);
            // Highlight nodes (only circles)
            nodeCircle.classed('chart-highlight', n => highlightSet.has(n))
                .classed('chart-faded', n => !highlightSet.has(n));
            // Highlight links
            link.classed('chart-highlight', l => highlightSet.has(l.source) && highlightSet.has(l.target))
                .classed('chart-faded', l => !(highlightSet.has(l.source) && highlightSet.has(l.target)));
        });
        node.on('mouseout', function() {
            nodeCircle.classed('chart-highlight', false).classed('chart-faded', false);
            link.classed('chart-highlight', false).classed('chart-faded', false);
        });
    }

    function startVisualizer() {
        renderTree();
        loadD3(renderChart); // renderChart calls setupCopyListeners after timeout
    }

    if (popup.document.readyState === 'loading') {
        popup.document.addEventListener('DOMContentLoaded', startVisualizer);
    } else {
        startVisualizer();
    }
})();