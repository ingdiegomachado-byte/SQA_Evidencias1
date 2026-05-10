/**
 * Evidencias SQA — editor-tools.js
 * Herramientas de dibujo y edición para el canvas de Fabric.js.
 */

import { state } from './state.js';
import { CONFIG, DOM } from './constants.js';
import { saveSnapshot } from './editor-history.js';

export function createFabricArrow(line, fCanvas) {
    const { x1, y1, x2, y2 } = line;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 15;
    const head = new fabric.Triangle({
        left: x2, top: y2, angle: (angle * 180 / Math.PI) + 90,
        width: headLength, height: headLength, fill: line.stroke,
        originX: 'center', originY: 'center', selectable: false, evented: false,
        strokeWidth: 0
    });
    const group = new fabric.Group([line, head], { 
        selectable: true, 
        evented: true, 
        ...CONFIG.SQA_OBJ_CONFIG,
        padding: 2,
        subTargetCheck: false
    });
    group.canvas = fCanvas;
    fCanvas.remove(line); 
    fCanvas.add(group); 
    fCanvas.setActiveObject(group);
    fCanvas.renderAll();
}

export function prepareBlurredPattern(bgImage) {
    if (!bgImage) return null;
    const tempCanvas = document.createElement('canvas');
    const bgElement = bgImage._element;
    tempCanvas.width = bgElement.width;
    tempCanvas.height = bgElement.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.filter = 'blur(12px)';
    ctx.drawImage(bgElement, 0, 0);
    
    return new fabric.Pattern({
        source: tempCanvas,
        repeat: 'no-repeat'
    });
}

export function syncBlurPattern(obj, fCanvas) {
    if (!obj.fill || !obj.fill.source || !obj.isBlur) return;
    const bg = fCanvas.backgroundImage;
    const bgX = bg ? bg.left : 0;
    const bgY = bg ? bg.top : 0;

    obj.fill.offsetX = (bgX - obj.left) / obj.scaleX;
    obj.fill.offsetY = (bgY - obj.top) / obj.scaleY;
    obj.fill.scaleX = 1 / obj.scaleX;
    obj.fill.scaleY = 1 / obj.scaleY;
}

export function duplicateSelected(fCanvas) {
    const active = fCanvas.getActiveObject();
    if (!active) return;
    
    active.clone((cloned) => {
        fCanvas.discardActiveObject();
        cloned.set({
            left: cloned.left + 20,
            top: cloned.top + 20,
            evented: true,
        });
        if (cloned.type === 'activeSelection') {
            cloned.canvas = fCanvas;
            cloned.forEachObject((obj) => fCanvas.add(obj));
            cloned.setCoords();
        } else {
            fCanvas.add(cloned);
        }
        fCanvas.setActiveObject(cloned);
        fCanvas.renderAll();
        saveSnapshot();
    });
}
