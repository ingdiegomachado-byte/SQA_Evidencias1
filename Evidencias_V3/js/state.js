/**
 * Evidencias SQA — state.js
 * Gestión del estado global de la aplicación.
 */

import { CONFIG } from './constants.js';

export const state = {
    view: {
        current: "viewer",
        targetAfterLoad: null
    },
    editor: {
        fCanvas: null,
        zoom: 0.5,
        tool: null,
        color: "#FF3B30",
        history: [],
        future: [],
        isDrawing: false,
        activeObj: null,
        isSaving: false,
        startX: 0,
        startY: 0
    },
    crop: {
        rect: { x: 0, y: 0, w: 0, h: 0 },
        isDragging: false,
        activeHandle: null,
        dragStart: null
    },
    history: {
        selectionMode: false,
        selectedIds: new Set(),
        captures: [],
        visibleCount: CONFIG.HISTORY_PAGE_SIZE
    },
    dialog: {
        pendingResolver: null
    },
    currentActiveCaptureId: null,
    currentBlobUrl: null
};

// Proxies de conveniencia para mantener compatibilidad si es necesario, 
// o simplemente exportar el objeto state.
export default state;
