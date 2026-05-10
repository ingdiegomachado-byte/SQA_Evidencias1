document.addEventListener('DOMContentLoaded', () => {
  const ACTIONS = Object.freeze({
    captureAll: 'ACTION_CAPTURE_ALL',
    captureVisible: 'ACTION_CAPTURE_VISIBLE',
    getCaptureStatus: 'GET_CAPTURE_STATUS',
    resetCaptureStatus: 'RESET_CAPTURE_STATUS',
    captureStatus: 'CAPTURE_STATUS'
  });
  const btnCaptureAll = document.getElementById('btnCaptureAll');
  const btnCaptureVisible = document.getElementById('btnCaptureVisible');
  const btnBackToMenu = document.getElementById('btnBackToMenu');
  const menuView = document.getElementById('menuView');
  const progressView = document.getElementById('progressView');
  const progressTitle = document.getElementById('progressTitle');
  const progressValue = document.getElementById('progressValue');
  const progressBar = document.getElementById('progressBar');
  const statusText = document.getElementById('statusText');
  const errorText = document.getElementById('errorText');
  const toastEl = document.getElementById('toast');
  const body = document.body;

  function showToast(msg, type = "success") {
    if (!toastEl) return;
    toastEl.textContent = msg;
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

  function showMenu() {
    body.classList.remove('progress-mode');
    menuView.classList.remove('hidden');
    progressView.classList.add('hidden');
    btnBackToMenu.classList.add('hidden');
    errorText.classList.remove('visible');
    errorText.textContent = '';
    setButtonsDisabled(false);
  }

  function showProgress() {
    body.classList.add('progress-mode');
    menuView.classList.add('hidden');
    progressView.classList.remove('hidden');
  }

  function applyStatus(status) {
    if (!status || status.phase === 'idle') {
      showMenu();
      return;
    }

    showProgress();

    const progress = Math.max(0, Math.min(100, Math.round(status.progress || 0)));
    if (progressTitle) progressTitle.textContent = 'QA CAPTURE';
    progressValue.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;
    statusText.textContent = status.error || status.message || 'Procesando...';

    if (status.phase === 'error' && status.error) {
      errorText.textContent = status.error;
      errorText.classList.add('visible');
      showToast(status.error, "error");
      btnBackToMenu.classList.remove('hidden');
      setButtonsDisabled(false);
      return;
    }

    errorText.classList.remove('visible');
    errorText.textContent = '';

    if (status.phase === 'completed') {
      btnBackToMenu.classList.remove('hidden');
      setButtonsDisabled(false);
    } else {
      btnBackToMenu.classList.add('hidden');
      setButtonsDisabled(true);
    }
  }

  async function requestStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: ACTIONS.getCaptureStatus });
      applyStatus(response && response.status ? response.status : null);
    } catch (error) {
      showMenu();
    }
  }

  async function startCapture(action) {
    setButtonsDisabled(true);
    showProgress();
    if (progressTitle) progressTitle.textContent = 'QA CAPTURE';
    progressValue.textContent = '0%';
    progressBar.style.width = '0%';
    statusText.textContent = 'Preparando captura...';
    errorText.classList.remove('visible');
    errorText.textContent = '';
    btnBackToMenu.classList.add('hidden');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showMenu();
      return;
    }

    await chrome.runtime.sendMessage({ action, tab });
    await requestStatus();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === ACTIONS.captureStatus && message.status) {
      applyStatus(message.status);
    }
  });

  btnCaptureAll.addEventListener('click', () => startCapture(ACTIONS.captureAll));
  btnCaptureVisible.addEventListener('click', () => startCapture(ACTIONS.captureVisible));
  btnBackToMenu.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: ACTIONS.resetCaptureStatus });
    showMenu();
  });

  requestStatus();
});
