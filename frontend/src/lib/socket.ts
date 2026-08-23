import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

// Use standard API URL or fallback to localhost, but strip /api to avoid wrong namespace
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  private constructor() {
    this.connect();
  }

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  private connect() {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO Disconnected');
    });

    // Catch-all for events to dispatch to specific listeners
    this.socket.onAny((eventName, ...args) => {
      if (this.listeners.has(eventName)) {
        this.listeners.get(eventName)!.forEach(callback => callback(...args));
      }
    });
  }

  public subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.unsubscribe(event, callback);
  }

  public unsubscribe(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  public joinRoom(room: string) {
    if (this.socket) {
      this.socket.emit('join_room', room);
    }
  }

  public leaveRoom(room: string) {
    if (this.socket) {
      this.socket.emit('leave_room', room);
    }
  }

  public getSocket() {
    return this.socket;
  }
}

export const socketManager = SocketManager.getInstance();

export function useSocketEvents(events: Record<string, Function>) {
  const eventsRef = useRef(events);
  
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const unsubscribers: Function[] = [];
    
    Object.keys(eventsRef.current).forEach((event) => {
      const unsub = socketManager.subscribe(event, (...args: any[]) => {
        if (eventsRef.current[event]) {
          eventsRef.current[event](...args);
        }
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [JSON.stringify(Object.keys(events))]);
}
