import { io } from 'socket.io-client';

let socket = null;

export const initiateSocketConnection = (parentId, deviceId) => {
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8443';
  socket = io(socketUrl, {
    auth: {
      parentId,
      deviceId
    },
    transports: ['websocket', 'polling']
  });

  console.log('Connecting to WebSocket server...');
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    console.log('Disconnected from WebSocket.');
  }
};

export const getSocket = () => socket;
