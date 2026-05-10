/**
 * Evidencias SQA — background/capture-logic.js
 * Lógica de captura y procesamiento de fragmentos.
 */

import { workerState, captureStatus, captureInProgress } from './state.js';
import { updateCaptureStatus, broadcastCaptureStatus, syncBadge } from './utils.js';
import { CAPTURE_VISIBLE_TAB_MIN_INTERVAL_MS } from './constants.js';

export async function executeCapture(tab, actionName) {
    const tabUrl = tab.url || '';
    if (
        !tabUrl ||
        tabUrl.startsWith("chrome://") ||
        tabUrl.startsWith("chrome-error://") ||
        tabUrl.startsWith("edge://") ||
        tabUrl.startsWith("about:") ||
        tabUrl.startsWith("chrome-extension://") ||
        tabUrl.includes("chrome.google.com/webstore") ||
        tabUrl.includes("chromewebstore.google.com")
    ) {
        console.warn("Captura no permitida en esta pestaña:", tabUrl);
        markCaptureError("Captura no permitida", tab.id);
        return;
    }

    if (captureInProgress.has(tab.id)) {
        updateCaptureStatus({ active: true, message: 'Ya hay una captura en curso.', tabId: tab.id });
        return;
    }

    captureInProgress.add(tab.id);
    workerState.activeTab = tab;
    
    updateCaptureStatus({
        active: true,
        mode: actionName === "captureAllPageScreenshot" ? 'full' : 'visible',
        progress: actionName === "captureAllPageScreenshot" ? 5 : 10,
        phase: 'starting',
        message: 'Preparando captura...',
        error: '',
        tabId: tab.id
    });

    try {
        const isLoaded = await checkContentScript(tab.id);
        if (!isLoaded) {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
            await new Promise(r => setTimeout(r, 100));
        }

        const sent = await retrySendMessage(tab.id, { action: actionName });
        if (!sent) {
            captureInProgress.delete(tab.id);
            markCaptureError("No se pudo iniciar la captura.", tab.id);
        }
    } catch (err) {
        captureInProgress.delete(tab.id);
        markCaptureError(err.message, tab.id);
    }
}

async function checkContentScript(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: "checkContentLoaded" }, (res) => {
            if (chrome.runtime.lastError || !res || !res.loaded) resolve(false);
            else resolve(true);
        });
    });
}

async function retrySendMessage(tabId, msg, retries = 3) {
    for (let i = 1; i <= retries; i++) {
        const success = await new Promise(resolve => {
            chrome.tabs.sendMessage(tabId, msg, () => {
                if (chrome.runtime.lastError) resolve(false);
                else resolve(true);
            });
        });
        if (success) return true;
        await new Promise(r => setTimeout(r, 100 * i));
    }
    return false;
}

export function markCaptureCompleted(message = 'Captura completada.') {
    if (workerState.clearCompletedStatusTimer) clearTimeout(workerState.clearCompletedStatusTimer);
    if (captureStatus.tabId) captureInProgress.delete(captureStatus.tabId);

    updateCaptureStatus({ active: false, progress: 100, phase: 'completed', message, error: '' });
    workerState.clearCompletedStatusTimer = setTimeout(() => {
        updateCaptureStatus({ active: false, mode: null, progress: 0, phase: 'idle', message: '', error: '', tabId: null });
    }, 4000);
}

export function markCaptureError(message, tabId = captureStatus.tabId) {
    if (workerState.clearCompletedStatusTimer) clearTimeout(workerState.clearCompletedStatusTimer);
    if (tabId) captureInProgress.delete(tabId);

    updateCaptureStatus({ active: false, phase: 'error', message: 'La captura se detuvo.', error: message || 'Error', tabId });
}

export async function waitForCaptureQuota() {
    const elapsed = Date.now() - workerState.lastCaptureVisibleTabAt;
    const waitMs = Math.max(0, CAPTURE_VISIBLE_TAB_MIN_INTERVAL_MS - elapsed);
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
    workerState.lastCaptureVisibleTabAt = Date.now();
}
