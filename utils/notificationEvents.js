const listeners = {};

export const notificationEvents = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(f => f !== fn);
  },
  emit(event, ...args) {
    if (!listeners[event]) return;
    listeners[event].forEach(fn => fn(...args));
  },
};
