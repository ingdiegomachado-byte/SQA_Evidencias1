document.addEventListener('DOMContentLoaded', () => {
  const ACTIONS = Object.freeze({
    captureAll: 'ACTION_CAPTURE_ALL',
    captureVisible: 'ACTION_CAPTURE_VISIBLE',
    openViewer: 'ACTION_OPEN_VIEWER',
    getCaptureStatus: 'GET_CAPTURE_STATUS',
    resetCaptureStatus: 'RESET_CAPTURE_STATUS',
    captureStatus: 'CAPTURE_STATUS'
  });
  const btnCaptureAll = document.getElementById('btnCaptureAll');
  const btnCaptureVisible = document.getElementById('btnCaptureVisible');
  const btnOpenViewer = document.getElementById('btnOpenViewer');
  const toastEl = document.getElementById('toast');

  function showToast(msg, type = "success") {
    if (!toastEl) return;
    
    let icon = "✅";
    if (type === "error") icon = "⚠️";
    if (msg.includes("realizada") || msg.includes("iniciada")) icon = "📸";
    if (msg.includes("Descarga")) icon = "📥";

    toastEl.innerHTML = `<span style="font-size:1.2em;">${icon}</span> <span>${msg.replace(/^[^\s\w]+/, '').trim()}</span>`;
    
    toastEl.className = "";
    if (type === "error") toastEl.classList.add("error");
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 3000);
  }

  function setButtonsDisabled(disabled) {
    btnCaptureAll.disabled = disabled;
    btnCaptureVisible.disabled = disabled;
  }

  async function startCapture(action) {
    setButtonsDisabled(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      setButtonsDisabled(false);
      return;
    }

    try {
      await chrome.runtime.sendMessage({ action, tabId: tab.id });
      // Cerrar el popup inmediatamente para evitar doble clic y confusión
      setTimeout(() => window.close(), 150);
    } catch (error) {
      console.error("Error starting capture:", error);
      showToast("Error al iniciar captura", "error");
      setButtonsDisabled(false);
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === ACTIONS.captureStatus && message.status) {
      if (message.status.phase === 'error' && message.status.error) {
          let errorMsg = message.status.error;
          showToast(errorMsg, "error");
          setButtonsDisabled(false);
      } else if (message.status.phase === 'completed') {
          showToast("Captura realizada");
          setButtonsDisabled(false);
      }
    }
  });

  btnCaptureAll.addEventListener('click', () => startCapture(ACTIONS.captureAll));
  btnCaptureVisible.addEventListener('click', () => startCapture(ACTIONS.captureVisible));
  if (btnOpenViewer) {
    btnOpenViewer.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: ACTIONS.openViewer });
      setTimeout(() => window.close(), 150);
    });
  }
});
