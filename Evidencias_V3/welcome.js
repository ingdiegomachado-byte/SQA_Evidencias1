// Compatibilidad multiplataforma
if (typeof browser !== 'undefined' && typeof chrome === 'undefined') {
    window.chrome = browser;
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('closeWelcome');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          // Abrir el visor antes de cerrar la bienvenida
          chrome.tabs.create({ url: chrome.runtime.getURL("result.html") });
          
          chrome.tabs.getCurrent((tab) => {
            if (tab) {
              chrome.tabs.remove(tab.id);
            } else {
              window.close();
            }
          });
        } else {
          window.close();
        }
      } catch (err) {
        window.close();
      }
    });
  }
});
