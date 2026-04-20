import { io } from 'socket.io-client';
import { API_BASE_URL } from './config';

// Lazy socket initialization - connects only when first used
let _socket = null;

export function getSocket() {
  if (!_socket) {
    console.log('[Socket] Creating socket connection to', API_BASE_URL);
    try {
      _socket = io(API_BASE_URL, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
      });
    } catch (e) {
      console.error('[Socket] Failed to create socket:', e);
    }
  }
  return _socket;
}

// Legacy export - use getSocket() instead
// This creates the socket immediately when accessed, but not at import time
export const socket = {
  get connected() { return getSocket()?.connected ?? false; },
  get id() { return getSocket()?.id; },
  on: (...args) => getSocket()?.on?.(...args),
  off: (...args) => getSocket()?.off?.(...args),
  emit: (...args) => getSocket()?.emit?.(...args),
  connect: () => getSocket()?.connect?.(),
  disconnect: () => getSocket()?.disconnect?.(),
};
