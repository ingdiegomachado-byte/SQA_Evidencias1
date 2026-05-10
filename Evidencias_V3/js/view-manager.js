/**
 * Evidencias SQA — view-manager.js
 * Gestión de vistas, navegación y renderizado del historial.
 */

import { state } from './state.js';
import { DOM, CONFIG } from './constants.js';
import { getAllFromIndexedDB, deleteFromIndexedDB } from './db.js';
import { showConfirmDialog, showToast, hideLoading } from './ui-utils.js';

export function switchView(viewName, onLoaded) {
    state.view.current = viewName;
    
    const views = {
        "viewer": DOM.view.viewer,
        "history": DOM.view.history,
        "editor": DOM.view.editor
    };

    Object.keys(views).forEach(v => {
        const el = views[v];
        if (v === viewName) {
            el.classList.remove("view-hidden");
            el.classList.add("view-visible");
        } else {
            el.classList.remove("view-visible");
            el.classList.add("view-hidden");
        }
    });

    // Añadir atributo de datos al body para CSS global
    document.body.dataset.view = viewName;
    
    document.title = `${viewName.charAt(0).toUpperCase() + viewName.slice(1)} — QA`;
    
    if (viewName === "history") {
        onLoaded && onLoaded("history");
    } else if (viewName === "viewer") {
        onLoaded && onLoaded("viewer");
    } else {
        onLoaded && onLoaded("editor");
    }
}

let historyObserver = null;

function initHistoryObserver() {
    if (historyObserver) {
        historyObserver.disconnect();
    }
    
    historyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                historyObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: "50px 0px", // Carga las imágenes un poco antes de que entren
        threshold: 0.01
    });
}

export function renderHistoryItems(onDelete, onOpen, onSelect, onCopy, onDownload) {
    initHistoryObserver();
    
    const historyItems = state.history.captures.slice().reverse();
    DOM.historialContainer.innerHTML = '';

    const hasCaptures = historyItems.length > 0;
    DOM.deleteAllBtn.disabled = !hasCaptures;
    DOM.downloadAllBtn.disabled = !hasCaptures;
    DOM.toggleSelectionBtn.disabled = !hasCaptures;

    if (!hasCaptures) {
        DOM.historialContainer.innerHTML = "<div class='empty'>Sin capturas registradas.</div>";
        DOM.historyLoadMoreBtn.classList.add("hidden");
        return;
    }

    historyItems.slice(0, state.history.visibleCount).forEach((item) => {
        const div = document.createElement("div");
        div.className = "item";
        if (state.history.selectionMode) div.classList.add("selection-mode");
        if (state.history.selectedIds.has(item.id)) div.classList.add("selected");
        
        const previewSrc = item.thumbDataUrl || item.thumbnailDataUrl || item.dataUrl;
        
        div.innerHTML = `
            <div class="item-preview">
                ${state.history.selectionMode ? `<div class="select-badge">${state.history.selectedIds.has(item.id) ? "✓" : ""}</div>` : ""}
                ${item.isEdited ? `<div class="edited-badge" title="Esta imagen ha sido editada">✏️</div>` : ""}
                <img data-src="${previewSrc}" class="imgPreview lazy-img" alt="Captura" />
            </div>
            <div class="item-meta">
                <div class="date"><b>Fecha:</b> ${new Date(item.date).toLocaleString()}</div>
                <div class="url"><b>URL:</b> ${item.url || 'N/A'}</div>
            </div>
            <div class="item-actions" ${state.history.selectionMode ? 'style="display:none"' : ''}>
                <button class="copyBtn">Copiar</button>
                <button class="dlBtn">Descargar</button>
                <button class="delBtn">Borrar</button>
            </div>`;
        
        const img = div.querySelector(".imgPreview");
        historyObserver.observe(img);

        img.onclick = (e) => {
            e.stopPropagation();
            if (state.history.selectionMode) {
                onSelect(item.id);
            } else {
                onOpen(item);
            }
        };
        
        div.onclick = (e) => {
            if (state.history.selectionMode && !e.target.closest(".item-actions")) {
                onSelect(item.id);
            }
        };

        div.querySelector(".copyBtn").onclick = (e) => {
            e.stopPropagation();
            onCopy(item);
        };

        div.querySelector(".dlBtn").onclick = (e) => {
            e.stopPropagation();
            onDownload(item);
        };

        div.querySelector(".delBtn").onclick = async (e) => {
            e.stopPropagation();
            if (await showConfirmDialog("¿Borrar esta captura?", "Eliminar captura", "Borrar", "danger")) {
                onDelete(item.id);
            }
        };
        
        DOM.historialContainer.appendChild(div);
    });

    DOM.historyLoadMoreBtn.classList.toggle("hidden", state.history.visibleCount >= historyItems.length);
}
