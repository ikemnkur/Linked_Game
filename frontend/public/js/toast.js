/* ─── Toast Notification System ──────────────────────── */

window.Toast = (() => {
  let container = null;

  function init() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  function show(message, type = 'info', duration = 3000) {
    init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function success(message, duration) {
    show(message, 'success', duration);
  }

  function info(message, duration) {
    show(message, 'info', duration);
  }

  function warning(message, duration) {
    show(message, 'warning', duration);
  }

  function error(message, duration) {
    show(message, 'error', duration);
  }

  return { show, success, info, warning, error };
})();
