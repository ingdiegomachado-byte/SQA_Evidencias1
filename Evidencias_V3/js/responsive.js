/**
 * Evidencias SQA — responsive.js
 * Lógica para adaptar las barras de herramientas al tamaño de pantalla.
 */

import { debounce } from './ui-utils.js';

export function setupAllToolbarsResponsiveness() {
    setupToolbarDropdown('more-tools-btn', 'more-tools-dropdown');
    setupToolbarDropdown('viewer-more-btn', 'viewer-more-dropdown');
    setupToolbarDropdown('history-more-btn', 'history-more-dropdown');

    window.addEventListener('resize', debounce(() => {
        updateEditorToolbarLayout();
        updateViewerToolbarLayout();
        updateHistoryToolbarLayout();
    }, 150));

    // Run initially
    setTimeout(() => {
        updateEditorToolbarLayout();
        updateViewerToolbarLayout();
        updateHistoryToolbarLayout();
    }, 150);
}

function setupToolbarDropdown(btnId, dropdownId) {
    const moreBtn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    if (!moreBtn || !dropdown) return;

    moreBtn.onclick = (e) => {
        e.stopPropagation();
        // Close other dropdowns first
        document.querySelectorAll('.more-tools-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('active');
        });
        dropdown.classList.toggle('active');
    };

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== moreBtn) {
            dropdown.classList.remove('active');
        }
    });
}

export function updateViewerToolbarLayout() {
    // Ported from original result.js
    const btn = document.getElementById('viewer-more-btn');
    const dropdown = document.getElementById('viewer-more-dropdown');
    const group = document.getElementById('viewerActionsGroup');
    if (!btn || !dropdown || !group) return;

    if (!window._viewerOriginals) {
        window._viewerOriginals = { parent: group.parentElement, next: group.nextElementSibling };
    }

    if (window.innerWidth < 850) {
        btn.style.display = 'flex';
        dropdown.appendChild(group);
    } else {
        btn.style.display = 'none';
        const reference = (window._viewerOriginals.next && window._viewerOriginals.next.parentNode === window._viewerOriginals.parent) ? window._viewerOriginals.next : null;
        window._viewerOriginals.parent.insertBefore(group, reference);
    }
}

export function updateHistoryToolbarLayout() {
    const btn = document.getElementById('history-more-btn');
    const dropdown = document.getElementById('history-more-dropdown');
    const group = document.getElementById('historyActionsGroup');
    if (!btn || !dropdown || !group) return;

    if (!window._historyOriginals) {
        window._historyOriginals = { parent: group.parentElement, next: group.nextElementSibling };
    }

    if (window.innerWidth < 1000) {
        btn.style.display = 'flex';
        dropdown.appendChild(group);
    } else {
        btn.style.display = 'none';
        const reference = (window._historyOriginals.next && window._historyOriginals.next.parentNode === window._historyOriginals.parent) ? window._historyOriginals.next : null;
        window._historyOriginals.parent.insertBefore(group, reference);
    }
}

export function updateEditorToolbarLayout() {
    const header = document.querySelector('.editor-header');
    const dropdown = document.getElementById('more-tools-dropdown');
    const moreBtn = document.getElementById('more-tools-btn');
    const drawToolbar = document.getElementById('drawToolbar');
    const optionsGroup = document.getElementById('editorOptionsGroup');
    const zoomGroup = document.getElementById('editorZoomGroup');
    const actionsSep = document.getElementById('actionsSep');
    
    if (!header || !dropdown || !moreBtn) return;

    if (!window._toolbarOriginals) {
        window._toolbarOriginals = {
            draw: { el: drawToolbar, parent: drawToolbar.parentElement, next: drawToolbar.nextElementSibling },
            options: { el: optionsGroup, parent: optionsGroup.parentElement, next: optionsGroup.nextElementSibling },
            zoom: { el: zoomGroup, parent: zoomGroup.parentElement, next: zoomGroup.nextElementSibling },
            sep: { el: actionsSep, parent: actionsSep.parentElement, next: actionsSep.nextElementSibling }
        };
    }

    const width = window.innerWidth;
    const reset = () => {
        const items = Object.values(window._toolbarOriginals);
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.parent && item.el) {
                const reference = (item.next && item.next.parentNode === item.parent) ? item.next : null;
                item.parent.insertBefore(item.el, reference);
            }
        }
        moreBtn.style.display = 'none';
        dropdown.classList.remove('active');
        if (actionsSep) actionsSep.style.display = 'block';
    };

    if (width < 1200) {
        moreBtn.style.display = 'flex';
        if (actionsSep) actionsSep.style.display = 'none';
        if (width < 600) {
            dropdown.appendChild(drawToolbar);
            dropdown.appendChild(optionsGroup);
            dropdown.appendChild(zoomGroup);
        } else if (width < 900) {
            dropdown.appendChild(optionsGroup);
            dropdown.appendChild(zoomGroup);
            window._toolbarOriginals.draw.parent.insertBefore(drawToolbar, moreBtn);
        } else {
            dropdown.appendChild(zoomGroup);
            window._toolbarOriginals.draw.parent.insertBefore(drawToolbar, moreBtn);
            window._toolbarOriginals.options.parent.insertBefore(optionsGroup, moreBtn);
        }
    } else {
        reset();
    }
}
