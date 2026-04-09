import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@prode/shared';

interface RealtimeState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token?: string) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    
    // Applying websocket-engineer skill exponential backoff
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      withCredentials: true,
    });

    socket.on(WS_EVENTS.CONNECT, () => {
      console.log('Connected to realtime server', socket.id);
      set({ isConnected: true });
    });

    socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      console.warn('Disconnected from realtime server:', reason);
      set({ isConnected: false });
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on(WS_EVENTS.CONNECT_ERROR, (err) => {
      console.error('Realtime connection error:', err.message);
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinGroup: (groupId: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit(WS_EVENTS.JOIN_ROOM, groupId);
    }
  },

  leaveGroup: (groupId: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit(WS_EVENTS.LEAVE_ROOM, groupId);
    }
  },
}));
