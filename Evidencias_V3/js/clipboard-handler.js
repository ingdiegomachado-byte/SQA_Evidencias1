/**
 * Evidencias SQA — clipboard-handler.js
 */

import { processImageWithHeader, buildThumbnail } from './image-logic.js';
import { upsertCapture } from './app-logic.js';
import { showToast } from './ui-utils.js';

export async function handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) await processClipboardFile(file);
        }
    }
}

export async function handleDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files) return;
    for (const file of files) {
        if (file.type.startsWith('image/')) await processClipboardFile(file);
    }
}

async function processClipboardFile(file) {
    try {
        const bitmap = await createImageBitmap(file);
        const processedCanvas = await processImageWithHeader(bitmap, "Adjunto Clipboard");
        const dataUrl = processedCanvas.toDataURL('image/png', 1.0);
        await upsertCapture(dataUrl, "clipboard://attached");
        showToast("Imagen adjuntada desde el portapapeles");
        if (typeof window.loadCapture === 'function') window.loadCapture();
    } catch (err) {
        console.error("Error clipboard:", err);
    }
}
