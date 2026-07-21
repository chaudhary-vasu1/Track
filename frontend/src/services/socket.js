import { io } from 'socket.io-client';

let socket = null;

export const initiateSocketConnection = (parentId, deviceId) => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://192.168.1.24:8443';
  socket = io(socketUrl, {
    auth: {
      parentId,
      deviceId
    },
    transports: ['websocket', 'polling']
  });

  console.log('Connecting to WebSocket server at:', socketUrl);

  socket.on('connect', () => {
    console.log('[Frontend Socket] Connected successfully. Socket ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Frontend Socket] Disconnected. Reason:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Frontend Socket] Connection Error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    console.log('Disconnected from WebSocket.');
  }
};

export const getSocket = () => socket;
