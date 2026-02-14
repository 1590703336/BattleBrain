import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types/socket';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  connect() {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000', {
      autoConnect: true,
      transports: ['websocket'],
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get instance() {
    return this.socket;
  }
}

export default new SocketService();
