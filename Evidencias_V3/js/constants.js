/**
 * Evidencias SQA — constants.js
 * Centralización de referencias DOM y configuraciones constantes.
 */

export const DOM = {
    view: {
        viewer: document.getElementById("viewer-view"),
        history: document.getElementById("history-view"),
        editor: document.getElementById("editor-view")
    },
    img: document.getElementById("screenshot"),
    imgContainer: document.querySelector(".img-container"),
    skeleton: document.getElementById("skeleton-loader"),
    emptyState: document.getElementById("empty-state"),
    toast: document.getElementById("toast"),
    
    // Botones Navegación
    historyLink: document.getElementById("historyLink"),
    backBtn: document.getElementById("backBtn"),
    prevCapture: document.getElementById("prevCaptureBtn"),
    nextCapture: document.getElementById("nextCaptureBtn"),
    
    // Visor Acciones
    copyBtn: document.getElementById("copyBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    editBtn: document.getElementById("editBtn"),
    deleteCurrentBtn: document.getElementById("deleteCurrentBtn"),
    viewerHelpBtn: document.getElementById("viewerHelpBtn"),
    
    // Historial
    historialContainer: document.getElementById("historialContainer"),
    deleteAllBtn: document.getElementById("deleteAllBtn"),
    downloadAllBtn: document.getElementById("downloadAllBtn"),
    toggleSelectionBtn: document.getElementById("toggleSelectionBtn"),
    selectionCount: document.getElementById("selectionCount"),
    downloadSelectedBtn: document.getElementById("downloadSelectedBtn"),
    copySelectedBtn: document.getElementById("copySelectedBtn"),
    deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
    historyLoadMoreBtn: document.getElementById("historyLoadMoreBtn"),
    historyHelpBtn: document.getElementById("historyHelpBtn"),
    
    // Editor UI
    editor: {
        canvas: document.getElementById("editorCanvas"),
        saveBtn: document.getElementById("editorSaveBtn"),
        cancelBtn: document.getElementById("editorCancelBtn"),
        undo: document.getElementById("tool-undo"),
        redo: document.getElementById("tool-redo"),
        strokeSize: document.getElementById("strokeSize"),
        canvasArea: document.getElementById("editorCanvasArea"),
        status: document.getElementById("editorStatus"),
        fontSize: document.getElementById("fontSizeInput"),
        helpBtn: document.getElementById("editorHelpBtn"),
        currentColorBtn: document.getElementById("currentColorBtn"),
        colorMenu: document.getElementById("colorMenu")
    },
    
    // Crop
    crop: {
        overlay: document.getElementById("cropOverlay"),
        top: document.getElementById("cs-top"),
        bottom: document.getElementById("cs-bottom"),
        left: document.getElementById("cs-left"),
        right: document.getElementById("cs-right"),
        border: document.getElementById("cb"),
        hTL: document.getElementById("ch-tl"),
        hTR: document.getElementById("ch-tr"),
        hBL: document.getElementById("ch-bl"),
        hBR: document.getElementById("ch-br")
    },
    
    // Diálogos & Guías
    confirm: {
        overlay: document.getElementById("confirmOverlay"),
        title: document.getElementById("confirmTitle"),
        message: document.getElementById("confirmMessage"),
        cancel: document.getElementById("confirmCancelBtn"),
        accept: document.getElementById("confirmAcceptBtn")
    },
    quickGuide: {
        overlay: document.getElementById("quickGuideOverlay"),
        iframe: document.getElementById("guideIframe"),
        close: document.getElementById("closeQuickGuideBtn")
    },
    zoom: {
        in: document.getElementById("zoom-in"),
        out: document.getElementById("zoom-out"),
        reset: document.getElementById("zoom-reset"),
        label: document.getElementById("zoom-label")
    }
};

export const CONFIG = {
    HISTORY_PAGE_SIZE: 24,
    SQA_OBJ_CONFIG: {
        transparentCorners: false,
        cornerColor: '#FF6B00',
        cornerStrokeColor: '#ffffff',
        cornerSize: 8,
        perPixelTargetFind: false,
        objectCaching: true
    }
};
