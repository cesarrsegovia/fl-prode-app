import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@prode/shared';

interface RealtimeState {
  socket: Socket | null;
  isConnected: boolean;
  joinedUserId: string | null;
  connect: (token?: string, userId?: string) => void;
  disconnect: () => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  joinUser: (userId: string) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  socket: null,
  isConnected: false,
  joinedUserId: null,

  connect: (token?: string, userId?: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
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
      set({ isConnected: true });
      const uid = userId ?? get().joinedUserId;
      if (uid) socket.emit(WS_EVENTS.JOIN_USER_ROOM, uid);
    });

    socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      set({ isConnected: false });
      if (reason === 'io server disconnect') socket.connect();
    });

    socket.on(WS_EVENTS.CONNECT_ERROR, (err) => {
      console.error('Realtime connection error:', err.message);
    });

    set({ socket, joinedUserId: userId ?? null });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, joinedUserId: null });
    }
  },

  joinGroup: (groupId) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) socket.emit(WS_EVENTS.JOIN_ROOM, groupId);
  },
  leaveGroup: (groupId) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) socket.emit(WS_EVENTS.LEAVE_ROOM, groupId);
  },
  joinUser: (userId) => {
    const { socket, isConnected } = get();
    set({ joinedUserId: userId });
    if (socket && isConnected) socket.emit(WS_EVENTS.JOIN_USER_ROOM, userId);
  },
}));
