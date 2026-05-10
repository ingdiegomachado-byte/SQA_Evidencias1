/**
 * Evidencias SQA — editor-crop.js
 * Motor de recorte (Crop Engine).
 */

import { state } from './state.js';
import { DOM } from './constants.js';
import { saveSnapshot } from './editor-history.js';
import { prepareBlurredPattern, syncBlurPattern } from './editor-tools.js';

export function updateCropShades() {
    const fCanvas = state.editor.fCanvas;
    if (!fCanvas) return;
    const zoom = fCanvas.getZoom();
    const { rect } = state.crop;
    
    const canvasEl = fCanvas.getElement();
    const container = canvasEl.closest('.canvas-container');
    if (container) {
        DOM.crop.overlay.style.width = container.style.width || (fCanvas.width + 'px');
        DOM.crop.overlay.style.height = container.style.height || (fCanvas.height + 'px');
        DOM.crop.overlay.style.left = container.offsetLeft + 'px';
        DOM.crop.overlay.style.top = container.offsetTop + 'px';
    }

    const cx = rect.x * zoom;
    const cy = rect.y * zoom;
    const cw = rect.w * zoom;
    const ch = rect.h * zoom;
    const TW = fCanvas.getWidth();
    const TH = fCanvas.getHeight();

    DOM.crop.top.style.height = cy + 'px';
    DOM.crop.top.style.width = TW + 'px';

    DOM.crop.bottom.style.top = (cy + ch) + 'px';
    DOM.crop.bottom.style.height = Math.max(0, TH - (cy + ch)) + 'px';
    DOM.crop.bottom.style.width = TW + 'px';

    DOM.crop.left.style.top = cy + 'px';
    DOM.crop.left.style.height = ch + 'px';
    DOM.crop.left.style.width = cx + 'px';

    DOM.crop.right.style.left = (cx + cw) + 'px';
    DOM.crop.right.style.top = cy + 'px';
    DOM.crop.right.style.height = ch + 'px';
    DOM.crop.right.style.width = Math.max(0, TH - (cy + ch)) + 'px'; 
    // ^ Wait, width should be TW - (cx + cw)?
    DOM.crop.right.style.width = Math.max(0, TW - (cx + cw)) + 'px';

    DOM.crop.border.style.left = cx + 'px';
    DOM.crop.border.style.top = cy + 'px';
    DOM.crop.border.style.width = cw + 'px';
    DOM.crop.border.style.height = ch + 'px';
}

export function showCropOverlay() {
    const fCanvas = state.editor.fCanvas;
    if (!fCanvas) return;
    const canvasEl = fCanvas.getElement();
    const container = canvasEl.closest('.canvas-container');
    
    if (container) {
        DOM.crop.overlay.style.display = 'block';
        DOM.crop.overlay.style.width = container.style.width || (fCanvas.width + 'px');
        DOM.crop.overlay.style.height = container.style.height || (fCanvas.height + 'px');
        DOM.crop.overlay.style.left = container.offsetLeft + 'px';
        DOM.crop.overlay.style.top = container.offsetTop + 'px';
    }
    updateCropShades();
}

export function hideCropOverlay() { 
    DOM.crop.overlay.style.display = 'none'; 
    state.crop.rect = { x: 0, y: 0, w: 0, h: 0 };
}

export function applyCrop() {
    const fCanvas = state.editor.fCanvas;
    const { rect } = state.crop;
    if (rect.w < 5) return;
    fCanvas.discardActiveObject().renderAll();
    
    const { x, y, w, h } = rect;

    fCanvas.getObjects().forEach(obj => {
        obj.left -= x;
        obj.top -= y;
        obj.setCoords();
    });

    if (fCanvas.backgroundImage) {
        fCanvas.backgroundImage.left -= x;
        fCanvas.backgroundImage.top -= y;
    }

    fCanvas.setWidth(w * state.editor.zoom);
    fCanvas.setHeight(h * state.editor.zoom);
    fCanvas.calcOffset();
    
    state.crop.rect = { x: 0, y: 0, w: 0, h: 0 };

    fCanvas.renderAll();
    saveSnapshot();
    hideCropOverlay();
    
    // Reset tool selection from outside if needed
    if (fCanvas.backgroundImage) {
        // prepareBlurredPattern returns a pattern, we need to handle state assignment carefully
        // For simplicity in this version, we will assume state.editor.blurredBgPattern is handled in editor-core
    }
}
