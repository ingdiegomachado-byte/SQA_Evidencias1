/**
 * Evidencias SQA — app-logic.js
 * Lógica de negocio de alto nivel (descargas, copiado, navegación compleja).
 */

import { state } from './state.js';
import { DOM, CONFIG } from './constants.js';
import { getAllFromIndexedDB, deleteFromIndexedDB, saveCaptureToDB } from './db.js';
import { showToast, showLoading, hideLoading, buildThumbnailDataUrl, dataURLtoBlob, formatEvidenceFileName } from './ui-utils.js';

export async function copyToClipboard(imgSrc, isAuto = false) {
    try {
        if (!imgSrc || (!imgSrc.startsWith('data:image') && !imgSrc.startsWith('blob:'))) return;
        if (isAuto && !document.hasFocus()) return;
        
        const resp = await fetch(imgSrc);
        const blob = await resp.blob();
        
        let blobToCopy = blob;
        if (blob.type !== 'image/png') {
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width; canvas.height = bitmap.height;
            canvas.getContext('2d').drawImage(bitmap, 0, 0);
            blobToCopy = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            bitmap.close();
        }
        
        if (!document.hasFocus()) {
            window.focus();
            await new Promise(r => setTimeout(r, 100));
        }

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blobToCopy })
        ]);
        
        if (!isAuto) showToast("¡Copiado al portapapeles!");
    } catch (err) {
        if (!isAuto) {
            console.error(err);
            showToast("Usa clic derecho -> Copiar imagen", "error");
        }
    }
}

export async function downloadCaptureBatch(items) {
    if (!items || !items.length) {
        showToast("No hay capturas para descargar", "info");
        return;
    }
    if (typeof JSZip === 'undefined') {
        showToast("Error: JSZip no disponible", "error");
        return;
    }

    const zip = new JSZip();
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const fileName = formatEvidenceFileName(item, i);
        if (item.blob) {
            zip.file(fileName, item.blob);
        } else if (item.dataUrl) {
            const base64Data = item.dataUrl.split(',')[1];
            zip.file(fileName, base64Data, { base64: true });
        }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SQA_Evidencias_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Descarga realizada");
}

export async function upsertCapture(dataUrl, pageUrl, existingId = null, isEdited = false) {
    const thumbDataUrl = await buildThumbnailDataUrl(dataUrl);
    const blob = dataURLtoBlob(dataUrl);
    
    const record = { 
        blob,
        thumbDataUrl, 
        url: pageUrl || '', 
        isEdited: isEdited,
        date: new Date().toISOString() 
    };
    const id = await saveCaptureToDB(record, existingId);
    chrome.storage.local.set({ lastCaptureId: id });
    return id;
}

export async function copySelectedToClipboard(items) {
    if (!items || !items.length) return;
    showLoading();
    const urlsToRevoke = [];
    try {
        let htmlContent = "";
        for (const item of items) {
            let src = item.dataUrl;
            if (!src && item.blob) {
                src = URL.createObjectURL(item.blob);
                urlsToRevoke.push(src);
            }
            if (src) htmlContent += `<img src="${src}"><br><br>`;
        }
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([`${items.length} capturas seleccionadas`], { type: 'text/plain' });
        window.focus();
        await navigator.clipboard.write([
            new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })
        ]);
        showToast(`${items.length} capturas copiadas`);
    } catch (err) {
        console.error(err);
        showToast("Error al copiar selección", "error");
    } finally {
        urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
        hideLoading();
    }
}
