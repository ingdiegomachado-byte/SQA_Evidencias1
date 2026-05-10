/**
 * Evidencias SQA — service-worker.js
 * Entry point del Service Worker modularizado.
 */

import { ACTIONS } from './js/background/constants.js';
import { workerState, captureStatus, captureInProgress } from './js/background/state.js';
import { updateCaptureStatus, broadcastCaptureStatus, syncBadge, buildThumbnailDataUrl } from './js/background/utils.js';
import { executeCapture, markCaptureCompleted, markCaptureError, waitForCaptureQuota } from './js/background/capture-logic.js';
import { openDB } from './js/db.js';

// --- Inicialización ---

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
    }
});

chrome.tabs.onActivated.addListener((info) => {
    chrome.tabs.get(info.tabId, (tab) => { if (tab) workerState.activeTab = tab; });
});

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (workerState.activeTab && workerState.activeTab.id === tabId) workerState.activeTab = tab;
});

// --- Comandos ---

chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        if (command === 'capture-all') executeCapture(tabs[0], "captureAllPageScreenshot");
        else if (command === 'capture-visible') executeCapture(tabs[0], "captureVisibleOnly");
        else if (command === 'open-viewer') openOrUpdateResultTab();
    });
});

// --- Mensajes ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handlers = {
        [ACTIONS.captureAll]: () => {
            if (message.tabId) chrome.tabs.get(message.tabId, t => executeCapture(t, "captureAllPageScreenshot"));
            else if (message.tab) executeCapture(message.tab, "captureAllPageScreenshot");
            sendResponse({ started: true });
        },
        [ACTIONS.captureVisible]: () => {
            if (message.tabId) chrome.tabs.get(message.tabId, t => executeCapture(t, "captureVisibleOnly"));
            else if (message.tab) executeCapture(message.tab, "captureVisibleOnly");
            sendResponse({ started: true });
        },
        [ACTIONS.openViewer]: () => {
            openOrUpdateResultTab(message.mode);
            sendResponse({ ok: true });
        },
        [ACTIONS.getCaptureStatus]: () => {
            sendResponse({ status: { ...captureStatus } });
        },
        [ACTIONS.resetCaptureStatus]: () => {
            if (captureStatus.tabId) captureInProgress.delete(captureStatus.tabId);
            updateCaptureStatus({ active: false, mode: null, progress: 0, phase: 'idle', message: '', error: '', tabId: null });
            sendResponse({ ok: true });
        },
        [ACTIONS.setProgress]: () => {
            const tid = sender.tab ? sender.tab.id : captureStatus.tabId;
            updateCaptureStatus({
                active: true, progress: message.progress,
                phase: message.progress >= 100 ? 'processing' : 'capturing',
                message: message.progress >= 100 ? 'Procesando...' : 'Capturando...',
                tabId: tid
            });
        },
        "captureVisiblePageScreenshot": () => {
            handleVisibleCaptureRequest(message, sender);
            return true;
        },
        "requestCaptureScreenshot": () => {
            sendResponse({ imageData: workerState.nowShotImgData, y1: message.y1, y2: message.y2 });
            workerState.nowShotImgData = '';
        },
        "DELETE_LAST_CAPTURE": () => {
            chrome.storage.local.get(["lastCaptureId"], (data) => {
                if (data.lastCaptureId) {
                    openDB(db => {
                        const tx = db.transaction(['captures'], 'readwrite');
                        tx.objectStore('captures').delete(data.lastCaptureId);
                        tx.oncomplete = () => {
                            chrome.storage.local.remove(["lastCaptureId", "lastCapture"]);
                            // Notificamos opcionalmente a las pestañas abiertas
                            chrome.runtime.sendMessage({ action: "RELOAD_CAPTURE" }).catch(() => {});
                        };
                    });
                }
            });
            sendResponse({ ok: true });
        }
    };

    if (message.action.startsWith('imgDataChunk')) {
        handleImageChunk(message, sender, sendResponse);
        return true;
    }

    if (handlers[message.action]) {
        return handlers[message.action]();
    }
});

// --- Lógica de Captura Visible Avanzada ---

async function handleVisibleCaptureRequest(message, sender) {
    const targetTabId = sender.tab ? sender.tab.id : (workerState.activeTab ? workerState.activeTab.id : null);
    if (!targetTabId) return;

    try {
        const checkTab = await new Promise(resolve => {
            chrome.tabs.get(targetTabId, (tab) => {
                if (chrome.runtime.lastError) resolve(null);
                else resolve(tab);
            });
        });
        if (!checkTab) return;

        chrome.tabs.sendMessage(targetTabId, { action: "hideFloatingThumbnail" }, () => {
            if (chrome.runtime.lastError) { /* ignore */ }
        });
        await new Promise(r => setTimeout(r, 150));

        const tab = await new Promise(resolve => {
            chrome.tabs.get(targetTabId, (t) => {
                if (chrome.runtime.lastError) resolve(null);
                else resolve(t);
            });
        });
        if (!tab) return;
        const windowId = tab.windowId;

        let attempt = 0;
        const MAX = 10;
        
        const tryCapture = async () => {
            attempt++;
            await waitForCaptureQuota();
            chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (data) => {
                if (chrome.runtime.lastError) {
                    if (attempt < MAX) setTimeout(tryCapture, 150);
                    else markCaptureError(chrome.runtime.lastError.message, targetTabId);
                    return;
                }
                
                chrome.tabs.get(targetTabId, (t) => {
                    if (chrome.runtime.lastError || !t) return;

                    workerState.nowShotImgData = data;
                    chrome.tabs.sendMessage(targetTabId, {
                        action: 'getNowShotImgData',
                        y1: message.y1, y2: message.y2,
                        nextPageData: message.nextPageData
                    }, () => {
                        if (chrome.runtime.lastError) markCaptureError(chrome.runtime.lastError.message, targetTabId);
                    });
                });
            });
        };
        tryCapture();
    } catch (e) {
        markCaptureError(e.message, targetTabId);
    }
}

// --- Manejo de Chunks de Imagen ---

function handleImageChunk(message, sender, sendResponse) {
    const chunkId = message.action;
    if (!globalThis.tempImageStorage) globalThis.tempImageStorage = {};
    if (message.dataIndex === 0) {
        globalThis.tempImageStorage[chunkId] = { data: '', nextIndex: 0 };
    }

    const storage = globalThis.tempImageStorage[chunkId];
    if (storage && message.dataIndex === storage.nextIndex) {
        storage.data += message.dataItem;
        storage.nextIndex++;
    }

    if (storage && message.dataIndex === (message.dataLength - 1) && message.hasNextImg === 0) {
        processFinalImage(storage.data, sender.tab);
        delete globalThis.tempImageStorage[chunkId];
    }
    sendResponse({ rtn: 1, index: message.dataIndex });
}

async function processFinalImage(imageData, tab) {
    const url = tab ? tab.url : "";
    const thumb = await buildThumbnailDataUrl(imageData);
    
    openDB(db => {
        const tx = db.transaction(['captures'], 'readwrite');
        const request = tx.objectStore('captures').add({
            dataUrl: imageData,
            thumbDataUrl: thumb,
            url: url,
            date: new Date().toISOString()
        });
        request.onsuccess = (e) => {
            const newId = e.target.result;
            chrome.storage.local.set({ lastCaptureId: newId, lastCapture: imageData });
        };
        tx.oncomplete = () => {
            if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, { action: "showFloatingThumbnail", imageData }).catch(() => openOrUpdateResultTab());
                captureInProgress.delete(tab.id);
            } else {
                openOrUpdateResultTab();
            }
            markCaptureCompleted();
        };
    });
}

// --- Utilidades de Ventana ---

function openOrUpdateResultTab(mode = 'viewer') {
    const url = chrome.runtime.getURL("result.html");
    chrome.tabs.query({}, (tabs) => {
        const found = tabs.find(t => t.url && t.url.includes("result.html"));
        if (found) {
            chrome.tabs.update(found.id, { active: true });
            chrome.windows.update(found.windowId, { focused: true });
            if (mode === 'edit') setTimeout(() => chrome.tabs.sendMessage(found.id, { action: "ENTER_EDIT_MODE" }).catch(() => {}), 300);
        } else {
            chrome.tabs.create({ url: url + (mode === 'edit' ? '?mode=edit' : '') });
        }
    });
}
