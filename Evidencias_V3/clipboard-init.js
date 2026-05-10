import { handlePaste, handleDrop } from './js/clipboard-handler.js';

const dropOverlay = document.getElementById('drop-zone-overlay');

document.addEventListener('paste', handlePaste);

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer.types.includes('Files')) {
    dropOverlay.classList.add('active');
  }
});

document.addEventListener('dragleave', (e) => {
  if (e.relatedTarget === null) {
    dropOverlay.classList.remove('active');
  }
});

document.addEventListener('drop', (e) => {
  dropOverlay.classList.remove('active');
  handleDrop(e);
});
