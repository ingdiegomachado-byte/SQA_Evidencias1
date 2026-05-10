/**
 * Evidencias SQA — main.js (Entry Point)
 * Inicialización de listeners, eventos y carga inicial.
 */

import { DOM, CONFIG } from './constants.js';
import { state } from './state.js';
import { openDB, getAllFromIndexedDB, deleteFromIndexedDB, clearAllFromIndexedDB } from './db.js';
import { showToast, showLoading, hideLoading, showConfirmDialog, resolveConfirm, buildThumbnailDataUrl, formatEvidenceFileName, debounce } from './ui-utils.js';
import { initEditor, applyZoom, deselectTool, resetEditor } from './editor-core.js';
import { undo, redo, saveSnapshot } from './editor-history.js';
import { duplicateSelected } from './editor-tools.js';
import { applyCrop, hideCropOverlay } from './editor-crop.js';
import { switchView, renderHistoryItems } from './view-manager.js';
import { copyToClipboard, downloadCaptureBatch, upsertCapture, copySelectedToClipboard } from './app-logic.js';
import { setupAllToolbarsResponsiveness, updateEditorToolbarLayout, updateViewerToolbarLayout, updateHistoryToolbarLayout } from './responsive.js';

// --- Inicialización ---

async function initApp() {
    setupGlobalListeners();
    setupAllToolbarsResponsiveness();
    loadCapture();
}

function switchViewWithLayout(view) {
    if (view === "history" || view === "viewer") {
        state.history.selectionMode = false;
        state.history.selectedIds.clear();
        // Refresh UI if we are dealing with history elements
        if (DOM.historialContainer) {
            renderHistory();
            updateHistoryUI();
            updateHistoryToolbarLayout();
        }
    }
    
    switchView(view, (v) => {
        if (v === "history") {
            loadHistory();
            setTimeout(updateHistoryToolbarLayout, 50);
        } else if (v === "viewer") {
            updateViewerNavigation();
            updateViewerControls();
            setTimeout(updateViewerToolbarLayout, 50);
        } else if (v === "editor") {
            setTimeout(updateEditorToolbarLayout, 50);
        }
    });
}

function setupGlobalListeners() {
    // Visor
    DOM.editBtn.onclick = () => initEditor(DOM.img.src, switchViewWithLayout);
    DOM.copyBtn.onclick = () => copyToClipboard(DOM.img.src);
    DOM.downloadBtn.onclick = () => downloadCurrent();
    DOM.deleteCurrentBtn.onclick = deleteCurrentCapture;
    DOM.historyLink.onclick = () => switchViewWithLayout("history");
    DOM.backBtn.onclick = () => switchViewWithLayout("viewer");
    DOM.prevCapture.onclick = () => navigateViewerCapture(-1);
    DOM.nextCapture.onclick = () => navigateViewerCapture(1);
    
    // Historial
    DOM.toggleSelectionBtn.onclick = () => toggleSelectionMode();
    DOM.deleteAllBtn.onclick = deleteAllHistory;
    DOM.downloadAllBtn.onclick = () => downloadCaptureBatch(state.history.captures);
    DOM.downloadSelectedBtn.onclick = () => downloadCaptureBatch(getSelectedCaptures());
    DOM.copySelectedBtn.onclick = () => copySelectedToClipboard(getSelectedCaptures());
    DOM.deleteSelectedBtn.onclick = deleteSelectedCaptures;
    DOM.historyLoadMoreBtn.onclick = () => {
        state.history.visibleCount += CONFIG.HISTORY_PAGE_SIZE;
        renderHistory();
    };

    // Editor
    DOM.editor.undo.onclick = undo;
    DOM.editor.redo.onclick = redo;
    DOM.editor.saveBtn.onclick = saveEditorChanges;
    DOM.editor.cancelBtn.onclick = () => {
        deselectTool();
        switchViewWithLayout("viewer");
    };
    
    ['arrow','rect','text','highlight','blur','crop'].forEach(t => {
        const btn = document.getElementById(`tool-${t}`);
        if (btn) btn.onclick = () => selectTool(t);
    });

    DOM.zoom.in.onclick = () => applyZoom(state.editor.zoom + 0.1);
    DOM.zoom.out.onclick = () => applyZoom(state.editor.zoom - 0.1);
    DOM.zoom.reset.onclick = () => applyZoom(1.0);

    // Guías de Ayuda
    [DOM.viewerHelpBtn, DOM.historyHelpBtn, DOM.editor.helpBtn].forEach(btn => {
        if (btn) btn.onclick = () => showHelpGuide();
    });
    DOM.quickGuide.close.onclick = hideHelpGuide;
    DOM.quickGuide.overlay.onclick = (e) => {
        if (e.target === DOM.quickGuide.overlay) hideHelpGuide();
    };

    // Color & Size
    setupColorPicker();
    DOM.editor.strokeSize.oninput = debounce(() => {
        if (!state.editor.fCanvas) return;
        const active = state.editor.fCanvas.getActiveObject();
        if (active) {
            active.set('strokeWidth', parseInt(DOM.editor.strokeSize.value));
            state.editor.fCanvas.renderAll();
            saveSnapshot();
        }
    }, 50);

    // Globales
    window.onkeydown = handleGlobalKeydown;
    DOM.confirm.cancel.onclick = () => resolveConfirm(false);
    DOM.confirm.accept.onclick = () => resolveConfirm(true);
    
    // Resize
    window.onresize = debounce(() => {
        if (state.editor.fCanvas) state.editor.fCanvas.calcOffset();
        // logic for toolbar responsiveness is in responsive.js listener
    }, 100);

    // Chrome Storage changes
    chrome.storage.onChanged.addListener(c => {
        if (c.lastCaptureId && c.lastCaptureId.newValue) {
            loadCapture();
        }
    });

    // Messages
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "ENTER_EDIT_MODE") loadCapture("editor");
        if (msg.action === "RELOAD_CAPTURE") loadCapture();
    });
}

// --- Lógica del Visor ---

async function loadCapture(targetView = "viewer") {
    // Cerrar cualquier modal, guía o diálogo abierto
    hideHelpGuide();
    if (DOM.confirm && DOM.confirm.overlay) {
        DOM.confirm.overlay.style.display = 'none';
        DOM.confirm.overlay.classList.remove("visible");
        DOM.confirm.overlay.setAttribute("aria-hidden", "true");
    }
    document.querySelectorAll(".modal.active, .confirm-overlay.active, .confirm-overlay.visible").forEach(m => {
        m.classList.remove("active", "visible");
    });

    // Limpiar zoom si estuviera activo
    document.body.classList.remove("zoom-active");

    if (targetView === "viewer") {
        resetEditor(); // Asegura limpiar editor y recortes pendientes
    }

    showLoading();
    chrome.storage.local.get(["lastCaptureId"], async (d) => {
        const captures = await getAllFromIndexedDB();
        state.history.captures = captures;
        
        let found = null;
        if (d.lastCaptureId) {
            found = captures.find(c => c.id === d.lastCaptureId);
        }
        if (!found && captures.length > 0) {
            found = captures[captures.length - 1];
        }

        if (found) {
            setViewerCapture(found);
            renderHistory(); 

            // Si es un cambio forzado al visor (por nueva captura) y estábamos en el editor, reseteamos localmente
            if (targetView === "viewer" && state.view.current === "editor") {
                if (state.editor.fCanvas) {
                    state.editor.fCanvas.clear();
                }
                state.editor.history = [];
                state.editor.future = [];
            }

            if (targetView === "editor") {
                initEditor(DOM.img.src, switchViewWithLayout);
            } else {
                state.view.current = null; // Forzar actualización de vista
                switchViewWithLayout("viewer");
            }
        } else {
            state.currentActiveCaptureId = null;
            renderHistory();
            hideLoading();
            showEmptyState();
            updateViewerControls();
            switchViewWithLayout("viewer");
        }
    });
}

function setViewerCapture(item) {
    state.currentActiveCaptureId = item.id;
    if (DOM.imgContainer) DOM.imgContainer.style.display = "block";
    if (DOM.emptyState) DOM.emptyState.classList.add("hidden");

    // Siempre resetear zoom al cambiar de imagen
    document.body.classList.remove("zoom-active");
    
    // Reset scroll positions of the main content area
    const scrollContainer = DOM.img?.parentElement?.parentElement;
    if (scrollContainer) {
        scrollContainer.scrollTop = 0;
        scrollContainer.scrollLeft = 0;
    }

    if (state.currentBlobUrl) URL.revokeObjectURL(state.currentBlobUrl);
    
    const url = item.blob ? URL.createObjectURL(item.blob) : item.dataUrl;
    if (item.blob) state.currentBlobUrl = url;
    else state.currentBlobUrl = null;

    DOM.img.src = url;
    DOM.img.onclick = () => document.body.classList.toggle("zoom-active");

    DOM.img.onload = () => {
        hideLoading();
        updateViewerNavigation();
        updateViewerControls();
    };
}

function updateViewerControls() {
    const exists = state.history.captures.some(c => c.id === state.currentActiveCaptureId);
    const hasCapture = !!state.currentActiveCaptureId && exists;
    
    if (!hasCapture) {
        state.currentActiveCaptureId = null;
        showEmptyState();
    } else {
        if (DOM.imgContainer) DOM.imgContainer.style.display = "block";
        if (DOM.emptyState) DOM.emptyState.classList.add("hidden");
    }

    [DOM.editBtn, DOM.copyBtn, DOM.downloadBtn, DOM.deleteCurrentBtn].forEach(btn => {
        if (btn) btn.disabled = !hasCapture;
    });
}

function updateViewerNavigation() {
    const idx = state.history.captures.findIndex(c => c.id === state.currentActiveCaptureId);
    DOM.prevCapture.disabled = idx <= 0;
    DOM.nextCapture.disabled = idx === -1 || idx === state.history.captures.length - 1;
}

function navigateViewerCapture(step) {
    const idx = state.history.captures.findIndex(c => c.id === state.currentActiveCaptureId);
    if (idx === -1) return;
    const nextIdx = idx + step;
    if (nextIdx >= 0 && nextIdx < state.history.captures.length) {
        setViewerCapture(state.history.captures[nextIdx]);
    }
}

async function deleteCurrentCapture() {
    if (await showConfirmDialog("¿Borrar esta captura?", "Eliminar", "Borrar", "danger")) {
        await deleteFromIndexedDB(state.currentActiveCaptureId);
        showToast("Borrada");
        loadCapture();
    }
}

function downloadCurrent() {
    const idx = state.history.captures.findIndex(c => c.id === state.currentActiveCaptureId);
    if (idx === -1) return;
    const item = state.history.captures[idx];
    const a = document.createElement('a');
    a.href = DOM.img.src;
    a.download = formatEvidenceFileName(item, idx);
    a.click();
    showToast("Descargada");
}

// --- Lógica del Historial ---

function loadHistory() {
    getAllFromIndexedDB().then(captures => {
        state.history.captures = captures;
        renderHistory();
        updateHistoryUI();
        updateHistoryToolbarLayout();
        updateViewerControls();
    });
}

function renderHistory() {
    renderHistoryItems(
        async (id) => {
            await deleteFromIndexedDB(id);
            loadHistory();
        },
        (item) => {
            setViewerCapture(item);
            switchViewWithLayout("viewer");
        },
        (id) => {
            if (state.history.selectedIds.has(id)) state.history.selectedIds.delete(id);
            else state.history.selectedIds.add(id);
            renderHistory();
            updateHistoryUI();
        },
        async (item) => {
            let src = item.dataUrl;
            let tempUrl = null;
            if (!src && item.blob) {
                tempUrl = URL.createObjectURL(item.blob);
                src = tempUrl;
            }
            if (src) await copyToClipboard(src);
            if (tempUrl) URL.revokeObjectURL(tempUrl);
        },
        (item) => {
            const idx = state.history.captures.findIndex(c => c.id === item.id);
            const a = document.createElement('a');
            let tempUrl = null;
            let href = item.dataUrl;
            if (!href && item.blob) {
                tempUrl = URL.createObjectURL(item.blob);
                href = tempUrl;
            }
            a.href = href;
            a.download = formatEvidenceFileName(item, idx);
            a.click();
            if (tempUrl) URL.revokeObjectURL(tempUrl);
            showToast("Descargada");
        }
    );
}

function toggleSelectionMode() {
    state.history.selectionMode = !state.history.selectionMode;
    state.history.selectedIds.clear();
    updateHistoryUI();
    renderHistory();
    updateHistoryToolbarLayout();
}

function updateHistoryUI() {
    const hasCaptures = state.history.captures.length > 0;
    const mode = state.history.selectionMode;
    const count = state.history.selectedIds.size;

    if (DOM.toggleSelectionBtn) {
        DOM.toggleSelectionBtn.disabled = !hasCaptures;
        DOM.toggleSelectionBtn.classList.toggle("active", mode);
        DOM.toggleSelectionBtn.textContent = mode ? "Cancelar Selección" : "Seleccionar";
    }

    if (DOM.selectionCount) {
        DOM.selectionCount.textContent = `${count} seleccionadas`;
        DOM.selectionCount.style.display = mode ? "inline" : "none";
    }

    const isSelectionActive = mode && count > 0;
    if (DOM.downloadSelectedBtn) {
        DOM.downloadSelectedBtn.style.display = mode ? "inline-block" : "none";
        DOM.downloadSelectedBtn.disabled = !isSelectionActive;
    }
    if (DOM.copySelectedBtn) {
        DOM.copySelectedBtn.style.display = mode ? "inline-block" : "none";
        DOM.copySelectedBtn.disabled = !isSelectionActive;
    }
    if (DOM.deleteSelectedBtn) {
        DOM.deleteSelectedBtn.style.display = mode ? "inline-block" : "none";
        DOM.deleteSelectedBtn.disabled = !isSelectionActive;
    }
    
    // Always show Download All and Delete All if not in selection mode
    if (DOM.downloadAllBtn) DOM.downloadAllBtn.style.display = mode ? "none" : "inline-block";
    if (DOM.deleteAllBtn) DOM.deleteAllBtn.style.display = mode ? "none" : "inline-block";
}

function getSelectedCaptures() {
    const ordered = [];
    for (const id of state.history.selectedIds) {
        const item = state.history.captures.find(c => c.id === id);
        if (item) ordered.push(item);
    }
    return ordered;
}

async function deleteSelectedCaptures() {
    const ids = Array.from(state.history.selectedIds);
    if (ids.length === 0) return;
    
    const confirmed = await showConfirmDialog(`¿Borrar ${ids.length} capturas?`, "Borrar", "Borrar", "danger");
    if (confirmed) {
        for (const id of ids) await deleteFromIndexedDB(id);
        state.history.selectedIds.clear();
        state.history.selectionMode = false;
        
        const captures = await getAllFromIndexedDB();
        state.history.captures = captures;
        renderHistory();
        updateHistoryUI();
        updateHistoryToolbarLayout();
        showToast("Borradas");
    }
}

async function deleteAllHistory() {
    const confirmed = await showConfirmDialog("¿Borrar TODO el historial?", "Borrar todo", "Borrar todo", "danger");
    if (confirmed) {
        await clearAllFromIndexedDB();
        state.history.captures = [];
        state.history.selectedIds.clear();
        state.history.selectionMode = false;
        
        if (state.view.current === "history") {
            renderHistory();
            updateHistoryUI();
            updateHistoryToolbarLayout();
            showToast("Historial vaciado");
        } else {
            loadCapture();
        }
    }
}

// --- Lógica del Editor ---

async function saveEditorChanges() {
    // Si estamos en modo recorte, aplicar el recorte antes de guardar
    if (state.editor.tool === 'crop' && state.crop.rect.w > 5) {
        applyCrop();
    }

    // Si no hay cambios (solo el snapshot inicial), simplemente volvemos al visor
    if (state.editor.history.length <= 1) {
        deselectTool();
        switchViewWithLayout("viewer");
        return;
    }

    state.editor.isSaving = true;
    showLoading();
    
    const multiplier = 1 / state.editor.zoom;
    const dataUrl = state.editor.fCanvas.toDataURL({ format: 'png', multiplier });
    
    // El usuario solicita mantener la original y generar una nueva con los cambios.
    // Por lo tanto, no pasamos el ID actual para que se cree un nuevo registro.
    await upsertCapture(dataUrl, window.location.href, null, true);
    
    await loadCapture();
    showToast("Cambios guardados");
    state.editor.isSaving = false;
    deselectTool();
}

function selectTool(tool) {
    if (state.editor.tool === tool) tool = null;
    state.editor.tool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `tool-${tool}`);
    });
    // Fabric logic...
    if (state.editor.fCanvas) {
        state.editor.fCanvas.selection = !tool || tool === 'select';
        state.editor.fCanvas.defaultCursor = (tool === 'blur' || tool === 'crop') ? 'crosshair' : 'default';
        if (tool === 'crop') hideCropOverlay();
    }
}

function setupColorPicker() {
    DOM.editor.currentColorBtn.onclick = (e) => {
        e.stopPropagation();
        DOM.editor.colorMenu.classList.toggle('active');
    };
    document.addEventListener('click', () => DOM.editor.colorMenu.classList.remove('active'));
    
    document.querySelectorAll(".color-swatch").forEach(swatch => {
        swatch.onclick = () => {
            state.editor.color = swatch.dataset.color;
            DOM.editor.currentColorBtn.style.background = state.editor.color;
            if (state.editor.fCanvas) {
                const active = state.editor.fCanvas.getActiveObject();
                if (active) {
                    if (active.type === 'i-text') active.set('fill', state.editor.color);
                    else active.set('stroke', state.editor.color);
                    state.editor.fCanvas.renderAll();
                    saveSnapshot();
                }
            }
        };
    });
}

function handleGlobalKeydown(e) {
    if (state.dialog.pendingResolver) {
        if (e.key === 'Escape') resolveConfirm(false);
        return;
    }

    if (e.key === 'Escape') {
        const guideVisible = DOM.quickGuide.overlay && DOM.quickGuide.overlay.classList.contains("active");
        if (guideVisible) {
            hideHelpGuide();
            return;
        }

        if (state.view.current === "editor") {
            deselectTool();
            switchViewWithLayout("viewer");
        } else if (state.view.current === "history") {
            if (state.history.selectionMode) {
                toggleSelectionMode();
            } else {
                switchViewWithLayout("viewer");
            }
        } else if (state.view.current === "viewer") {
            // Tecla Esc sirve como zoom en el visor
            document.body.classList.toggle("zoom-active");
        }
    }

    if (state.view.current === "editor") {
        if (e.ctrlKey && e.key === 'z') undo();
        if (e.ctrlKey && e.key === 'y') redo();
        if (e.ctrlKey && e.key === 'd') { e.preventDefault(); duplicateSelected(state.editor.fCanvas); }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const active = state.editor.fCanvas.getActiveObject();
            if (active) {
                state.editor.fCanvas.remove(active);
                state.editor.fCanvas.renderAll();
                saveSnapshot();
            }
        }
        if (state.editor.tool === 'crop' && e.key === 'Enter') applyCrop();
    }
    
    if (state.view.current === "viewer") {
        if (e.key === "ArrowLeft") navigateViewerCapture(-1);
        if (e.key === "ArrowRight") navigateViewerCapture(1);
        if (e.ctrlKey && e.key === 'c') { e.preventDefault(); copyToClipboard(DOM.img.src); }
    }
}

function showEmptyState() {
    if (state.currentBlobUrl) {
        URL.revokeObjectURL(state.currentBlobUrl);
        state.currentBlobUrl = null;
    }
    DOM.emptyState.classList.remove("hidden");
    DOM.imgContainer.style.display = "none";
    if (DOM.img) DOM.img.src = "";
}

// --- Guías ---

function showHelpGuide() {
    let guideUrl = "guide.html";
    if (state.view.current === "history") guideUrl = "guide_history.html";
    else if (state.view.current === "editor") guideUrl = "guide2.html";
    
    if (DOM.quickGuide.iframe) DOM.quickGuide.iframe.src = guideUrl;
    if (DOM.quickGuide.overlay) {
        DOM.quickGuide.overlay.style.display = 'flex';
        DOM.quickGuide.overlay.classList.add("active");
        DOM.quickGuide.overlay.setAttribute("aria-hidden", "false");
    }
}

function hideHelpGuide() {
    if (DOM.quickGuide.overlay) {
        // Accessibility: blur focused element within overlay before hiding
        if (DOM.quickGuide.overlay.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        DOM.quickGuide.overlay.style.display = 'none';
        DOM.quickGuide.overlay.classList.remove("active");
        DOM.quickGuide.overlay.setAttribute("aria-hidden", "true");
    }
    if (DOM.quickGuide.iframe) DOM.quickGuide.iframe.src = "about:blank";
}

// Arrancar
initApp();
