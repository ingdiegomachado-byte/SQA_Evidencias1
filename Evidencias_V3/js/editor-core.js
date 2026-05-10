/**
 * Evidencias SQA — editor-core.js
 * Inicialización y eventos base de Fabric.js.
 */

import { state } from './state.js';
import { DOM, CONFIG } from './constants.js';
import { saveSnapshot } from './editor-history.js';
import { createFabricArrow, prepareBlurredPattern, syncBlurPattern } from './editor-tools.js';
import { updateCropShades, showCropOverlay, hideCropOverlay, applyCrop } from './editor-crop.js';

let blurredBgPattern = null;

export function initEditor(imageSrc, onSwitchView) {
    if (!imageSrc) return;
    deselectTool();
    
    const im = new Image();
    im.onload = () => {
        const width = im.width;
        const height = im.height;
        if (width === 0 || height === 0) return;

        if (!state.editor.fCanvas) {
            state.editor.fCanvas = new fabric.Canvas('editorCanvas', {
                width: width,
                height: height,
                selection: true,
                preserveObjectStacking: true,
                stopContextMenu: true,
                renderOnAddRemove: false
            });
            setupFabricEvents(state.editor.fCanvas);
        } else {
            state.editor.fCanvas.clear();
            state.editor.fCanvas.setDimensions({ width, height });
        }

        fabric.Image.fromURL(imageSrc, (fImg) => {
            state.editor.fCanvas.setBackgroundImage(fImg, () => {
                applyZoom(0.5);
                state.editor.fCanvas.calcOffset();
                state.editor.fCanvas.renderAll();
                blurredBgPattern = prepareBlurredPattern(fImg);
            });
            state.editor.history = []; 
            state.editor.future = [];
            onSwitchView && onSwitchView("editor");
            saveSnapshot();
        });
    };
    im.src = imageSrc;
}

export function applyZoom(z) {
    const fCanvas = state.editor.fCanvas;
    state.editor.zoom = Math.min(5.0, Math.max(0.1, z));
    if (fCanvas && fCanvas.backgroundImage) {
        fCanvas.setZoom(state.editor.zoom);
        fCanvas.setWidth(fCanvas.backgroundImage.width * state.editor.zoom);
        fCanvas.setHeight(fCanvas.backgroundImage.height * state.editor.zoom);
        fCanvas.calcOffset();
        if (state.editor.tool === 'crop') updateCropShades();
    }
    if (DOM.zoom.label) {
        DOM.zoom.label.textContent = Math.round(state.editor.zoom * 100) + "%";
    }
}

function setupFabricEvents(fCanvas) {
    fCanvas.on('mouse:down', function (opt) {
        if (!state.editor.tool || state.editor.tool === 'select') return;
        const pointer = fCanvas.getPointer(opt.e);
        state.editor.isDrawing = true;
        state.editor.startX = pointer.x;
        state.editor.startY = pointer.y;

        if (state.editor.tool === 'crop') {
            if (DOM.crop.overlay.style.display !== 'block') {
                state.crop.rect = { x: state.editor.startX, y: state.editor.startY, w: 0, h: 0 };
            }
            return;
        }

        const color = state.editor.color;
        const stroke = parseInt(DOM.editor.strokeSize.value);

        if (state.editor.tool === 'rect') {
            state.editor.activeObj = new fabric.Rect({
                left: state.editor.startX, top: state.editor.startY, width: 0, height: 0,
                fill: 'rgba(0,0,0,0.001)',
                stroke: color, strokeWidth: stroke,
                selectable: false, evented: false,
                ...CONFIG.SQA_OBJ_CONFIG
            });
        } else if (state.editor.tool === 'highlight') {
            state.editor.activeObj = new fabric.Rect({
                left: state.editor.startX, top: state.editor.startY, width: 0, height: 0,
                fill: color, opacity: 0.35,
                selectable: false, evented: false,
                ...CONFIG.SQA_OBJ_CONFIG
            });
        } else if (state.editor.tool === 'arrow') {
            state.editor.activeObj = new fabric.Line([state.editor.startX, state.editor.startY, state.editor.startX, state.editor.startY], {
                stroke: color, strokeWidth: stroke, strokeLineCap: 'round',
                selectable: false, evented: false
            });
        } else if (state.editor.tool === 'text') {
            const text = new fabric.IText('Texto', {
                left: state.editor.startX, top: state.editor.startY,
                fontFamily: "'Segoe UI', Roboto, sans-serif",
                fontSize: parseInt(DOM.editor.fontSize.value) || 50,
                fill: color, stroke: '#ffffff', strokeWidth: 1, paintFirst: 'stroke',
                padding: 10,
                ...CONFIG.SQA_OBJ_CONFIG
            });
            fCanvas.add(text);
            fCanvas.setActiveObject(text);
            fCanvas.renderAll();
            text.enterEditing();
            text.selectAll();
            deselectTool();
            return;
        } else if (state.editor.tool === 'blur') {
            state.editor.activeObj = new fabric.Rect({
                left: state.editor.startX, top: state.editor.startY, width: 0, height: 0,
                fill: blurredBgPattern || 'rgba(0,0,0,0.2)',
                stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1,
                selectable: false, evented: false,
                isBlur: true,
                objectCaching: false
            });
        }

        if (state.editor.activeObj) {
            fCanvas.add(state.editor.activeObj);
            fCanvas.renderAll();
        }
    });

    fCanvas.on('mouse:move', function (opt) {
        if (!state.editor.isDrawing) return;
        const pointer = fCanvas.getPointer(opt.e);

        if (state.editor.tool === 'crop') {
            const zoom = fCanvas.getZoom();
            const limitX = fCanvas.width / zoom;
            const limitY = fCanvas.height / zoom;
            const curX = Math.max(0, Math.min(limitX, pointer.x));
            const curY = Math.max(0, Math.min(limitY, pointer.y));

            state.crop.rect.x = Math.min(state.editor.startX, curX);
            state.crop.rect.y = Math.min(state.editor.startY, curY);
            state.crop.rect.w = Math.max(0, Math.abs(state.editor.startX - curX));
            state.crop.rect.h = Math.max(0, Math.abs(state.editor.startY - curY));
            
            updateCropShades();
            if (state.crop.rect.w > 2 && DOM.crop.overlay.style.display !== 'block') {
                showCropOverlay();
            }
            return;
        }

        if (!state.editor.activeObj) return;

        if (state.editor.tool === 'arrow') {
            state.editor.activeObj.set({ x2: pointer.x, y2: pointer.y });
        } else {
            state.editor.activeObj.set({
                left: Math.min(state.editor.startX, pointer.x),
                top: Math.min(state.editor.startY, pointer.y),
                width: Math.abs(state.editor.startX - pointer.x),
                height: Math.abs(state.editor.startY - pointer.y)
            });
        }
        fCanvas.renderAll();
    });

    fCanvas.on('mouse:up', function () {
        if (!state.editor.isDrawing) return;
        state.editor.isDrawing = false;

        if (state.editor.tool === 'crop') {
            if (state.crop.rect.w < 10 || state.crop.rect.h < 10) {
                hideCropOverlay();
            }
            return;
        }

        if (state.editor.activeObj) {
            const obj = state.editor.activeObj;
            if (obj.width < 5 && obj.height < 5 && obj.type !== 'line') {
                fCanvas.remove(obj);
                fCanvas.renderAll();
            } else {
                obj.set({ selectable: true, evented: true, ...CONFIG.SQA_OBJ_CONFIG });
                obj.setCoords(); 
                
                if (state.editor.tool === 'arrow') {
                    createFabricArrow(obj, fCanvas);
                } else if (obj.isBlur) {
                    syncBlurPattern(obj, fCanvas);
                    fCanvas.calcOffset();
                    fCanvas.setActiveObject(obj);
                    fCanvas.renderAll();
                } else {
                    fCanvas.calcOffset();
                    fCanvas.setActiveObject(obj);
                    fCanvas.renderAll();
                }
                saveSnapshot();
            }
        }
        state.editor.activeObj = null;
        deselectTool();
    });

    fCanvas.on('mouse:wheel', function(opt) {
        if (opt.e.ctrlKey) {
            const delta = opt.e.deltaY;
            let zoom = fCanvas.getZoom();
            zoom *= 0.999 ** delta;
            applyZoom(zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        }
    });

    fCanvas.on('mouse:dblclick', function () {
        if (state.editor.tool === 'crop' && state.crop.rect.w > 5) applyCrop();
    });

    fCanvas.on('object:modified', () => saveSnapshot());

    fCanvas.on('object:moving', (e) => {
        if (e.target && e.target.isBlur) syncBlurPattern(e.target, fCanvas);
    });

    fCanvas.on('object:scaling', (e) => {
        if (e.target && e.target.isBlur) syncBlurPattern(e.target, fCanvas);
    });
}

export function resetEditor() {
    if (state.editor.fCanvas) {
        state.editor.fCanvas.clear();
        state.editor.history = [];
        state.editor.future = [];
    }
    hideCropOverlay();
    deselectTool();
}

export function deselectTool() {
    state.editor.tool = null;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if (state.editor.fCanvas) {
        state.editor.fCanvas.selection = true;
        state.editor.fCanvas.defaultCursor = 'default';
        state.editor.fCanvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = true;
            obj.set(CONFIG.SQA_OBJ_CONFIG);
        });
        state.editor.fCanvas.renderAll();
    }
}
