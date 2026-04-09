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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
    this.logger.log(`Client ${client.id} joined group:${groupId}`);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveGroup(client: Socket, groupId: string) {
    client.leave(`group:${groupId}`);
  }

  broadcastToGroup(groupId: string, event: string, data: unknown) {
    this.server.to(`group:${groupId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
