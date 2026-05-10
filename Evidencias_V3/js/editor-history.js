/**
 * Evidencias SQA — editor-history.js
 * Gestión del historial de edición (Undo/Redo).
 */

import { state } from './state.js';
import { DOM } from './constants.js';

export function saveSnapshot() {
    if (!state.editor.fCanvas) return;
    state.editor.history.push(JSON.stringify(state.editor.fCanvas));
    state.editor.future = [];
    updateUndoRedoBtns();
}

export function undo() {
    if (state.editor.history.length <= 1) return;
    state.editor.future.push(state.editor.history.pop());
    const snap = state.editor.history[state.editor.history.length - 1];
    
    state.editor.fCanvas.loadFromJSON(snap, () => {
        if (state.editor.fCanvas.backgroundImage) {
            const restoredW = state.editor.fCanvas.width;
            const originalW = state.editor.fCanvas.backgroundImage.width;
            state.editor.zoom = restoredW / originalW;
            // updateZoom UI logic should be called from main entry to keep separation
        }
        state.editor.fCanvas.renderAll();
        updateUndoRedoBtns();
    });
}

export function redo() {
    if (state.editor.future.length === 0) return;
    const snap = state.editor.future.pop();
    state.editor.history.push(snap);
    state.editor.fCanvas.loadFromJSON(snap, () => {
        if (state.editor.fCanvas.backgroundImage) {
            const restoredW = state.editor.fCanvas.width;
            const originalW = state.editor.fCanvas.backgroundImage.width;
            state.editor.zoom = restoredW / originalW;
        }
        state.editor.fCanvas.renderAll();
        updateUndoRedoBtns();
    });
}

export function updateUndoRedoBtns() {
    if (!DOM.editor.undo || !DOM.editor.redo) return;
    DOM.editor.undo.disabled = state.editor.history.length <= 1;
    DOM.editor.redo.disabled = state.editor.future.length === 0;
}
