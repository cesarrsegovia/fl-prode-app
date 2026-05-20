import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@prode/shared';

// Socket.IO admite array de orígenes o regex. Listamos los dev habituales
// + lo que esté en FRONTEND_URL (puede ser CSV) para evitar mismatches
// localhost/127.0.0.1.
const SOCKET_ORIGINS = [
  ...(process.env.FRONTEND_URL?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

@WebSocketGateway({
  cors: {
    origin: SOCKET_ORIGINS,
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinGroup(client: Socket, groupId: string) {
    client.join(`group:${groupId}`);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveGroup(client: Socket, groupId: string) {
    client.leave(`group:${groupId}`);
  }

  @SubscribeMessage(WS_EVENTS.JOIN_USER_ROOM)
  handleJoinUser(client: Socket, userId: string) {
    client.join(`user:${userId}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToGroup(groupId: string, event: string, data: unknown) {
    this.server.to(`group:${groupId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
