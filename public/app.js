// MDC Leisure Finder Portal — app.js
// Global flash auto-dismiss
document.addEventListener('DOMContentLoaded', () => {
  // Auto-dismiss flash messages after 4s
  document.querySelectorAll('.flash').forEach(el => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }, 4000);
  });
});
