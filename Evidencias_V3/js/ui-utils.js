/**
 * Evidencias SQA — ui-utils.js
 * Utilidades para la interfaz de usuario.
 */

import { DOM, CONFIG } from './constants.js';
import { state } from './state.js';

export function showToast(msg, type = "success") {
    if (!DOM.toast) return;
    
    let icon = "✅";
    if (type === "error") icon = "⚠️";
    else if (type === "info") icon = "ℹ️";
    
    if (msg.includes("Descarga")) icon = "📥";
    if (msg.includes("borrada") || msg.includes("Borrar")) icon = "🗑️";
    if (msg.includes("guardados") || msg.includes("aplicados")) icon = "💾";
    if (msg.includes("Copiado")) icon = "📋";

    DOM.toast.innerHTML = `<span style="font-size:1.2em;">${icon}</span> <span>${msg.replace(/^[^\s\w]+/, '').trim()}</span>`;
    DOM.toast.className = "";
    
    if (type === "error") DOM.toast.classList.add("error");
    else if (type === "info") DOM.toast.classList.add("info");
    else DOM.toast.classList.add("success");
    
    void DOM.toast.offsetWidth;
    DOM.toast.classList.add("show");
    
    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        if (DOM.toast) DOM.toast.classList.remove("show");
    }, 3000);
}

export function showLoading() {
    if (DOM.skeleton) DOM.skeleton.classList.add("active");
    if (DOM.img) DOM.img.style.opacity = "0";
    if (DOM.emptyState) DOM.emptyState.classList.add("hidden");
}

export function hideLoading() {
    if (DOM.skeleton) DOM.skeleton.classList.remove("active");
    if (DOM.img) {
        DOM.img.style.opacity = "1";
        const hasCaptures = state.history.captures.length > 0;
        if (DOM.imgContainer) DOM.imgContainer.style.display = hasCaptures ? "block" : "none";
        DOM.img.style.display = hasCaptures ? "block" : "none";
    }
}

export function showConfirmDialog(message, title = "Confirmar acción", acceptLabel = "Confirmar", type = "primary") {
    return new Promise((resolve) => {
        if (!DOM.confirm.overlay) {
            resolve(window.confirm(message));
            return;
        }
        state.dialog.pendingResolver = resolve;
        DOM.confirm.title.textContent = title;
        DOM.confirm.message.textContent = message;
        DOM.confirm.accept.textContent = acceptLabel;
        
        DOM.confirm.accept.className = "confirm-accept";
        if (type === "danger") DOM.confirm.accept.classList.add("is-danger");
        else if (type === "orange") DOM.confirm.accept.classList.add("is-orange");

        DOM.confirm.overlay.style.display = 'flex';
        DOM.confirm.overlay.classList.add("visible");
        DOM.confirm.overlay.setAttribute("aria-hidden", "false");
        DOM.confirm.accept.focus();
    });
}

export function resolveConfirm(result) {
    if (!state.dialog.pendingResolver) return;
    const resolver = state.dialog.pendingResolver;
    state.dialog.pendingResolver = null;
    
    // Accessibility: blur focused element within overlay before hiding
    if (DOM.confirm.overlay && DOM.confirm.overlay.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    if (DOM.confirm.overlay) {
        DOM.confirm.overlay.classList.remove("visible");
        DOM.confirm.overlay.style.display = 'none';
        DOM.confirm.overlay.setAttribute("aria-hidden", "true");
    }
    resolver(result);
}

export async function buildThumbnailDataUrl(dataUrl, maxWidth = 200) {
    if (!dataUrl) return dataUrl;
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let width = image.width;
            let height = image.height;
            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
    });
}

export function dataURLtoBlob(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    try {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("Error convirtiendo DataURL a Blob:", e);
        return null;
    }
}

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

export function formatEvidenceFileName(item, sequence) {
    const pad = n => n.toString().padStart(2, '0');
    const seq = pad(sequence ?? 0);
    return `Evidencia_${seq}.png`;
}
