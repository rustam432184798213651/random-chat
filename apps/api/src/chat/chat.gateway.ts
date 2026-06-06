import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@random-chat/shared';
import { ChatService } from './chat.service';
import { MatchmakingService } from './matchmaking.service';

const MAX_MESSAGE_LENGTH = 1000;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly matchmaking: MatchmakingService,
    private readonly chatService: ChatService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    await this.leaveCurrentChat(client, true);
    this.matchmaking.stopSearch(client.id);
    console.log(`disconnected: ${client.id}`);
  }

  @SubscribeMessage(ClientToServerEvents.FIND_PARTNER)
  async findPartner(@ConnectedSocket() client: Socket) {
    await this.leaveCurrentChat(client, false);

    const match = this.matchmaking.findMatch(client.id);
    if (!match) {
      client.emit(ServerToClientEvents.SEARCHING);
      return;
    }

    const partner = this.server.sockets.sockets.get(match.partnerId);
    if (!partner) {
      client.emit(ServerToClientEvents.SEARCHING);
      return;
    }

    await client.join(match.roomId);
    await partner.join(match.roomId);

    const session = await this.chatService.createSession(
      match.roomId,
      client.id,
      partner.id,
    );

    this.matchmaking.setSessionId(client.id, session.id);

    this.server.to(match.roomId).emit(ServerToClientEvents.CHAT_STARTED, {
      roomId: match.roomId,
    });
  }

  @SubscribeMessage(ClientToServerEvents.SEND_MESSAGE)
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { text?: string },
  ) {
    const text = body?.text?.trim();
    if (!text) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      client.emit(ServerToClientEvents.ERROR, {
        message: `Message is too long. Max ${MAX_MESSAGE_LENGTH} chars.`,
      });
      return;
    }

    const chat = this.matchmaking.getActiveChat(client.id);
    if (!chat?.sessionId) {
      client.emit(ServerToClientEvents.ERROR, { message: 'No active chat.' });
      return;
    }

    const message = await this.chatService.saveMessage(chat.sessionId, client.id, text);

    client.to(chat.roomId).emit(ServerToClientEvents.NEW_MESSAGE, {
      id: message.id,
      roomId: chat.roomId,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    });
  }

  @SubscribeMessage(ClientToServerEvents.NEXT_PARTNER)
  async nextPartner(@ConnectedSocket() client: Socket) {
    await this.leaveCurrentChat(client, false);
    await this.findPartner(client);
  }

  @SubscribeMessage(ClientToServerEvents.STOP_SEARCH)
  stopSearch(@ConnectedSocket() client: Socket) {
    this.matchmaking.stopSearch(client.id);
  }

  @SubscribeMessage(ClientToServerEvents.TYPING)
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { isTyping?: boolean },
  ) {
    const chat = this.matchmaking.getActiveChat(client.id);
    if (!chat) return;

    client.to(chat.roomId).emit(ServerToClientEvents.PARTNER_TYPING, {
      isTyping: Boolean(body?.isTyping),
    });
  }

  private async leaveCurrentChat(client: Socket, disconnected: boolean) {
    const chat = this.matchmaking.leave(client.id);
    if (!chat) return;

    await client.leave(chat.roomId);
    await this.chatService.endSession(chat.roomId);

    const partner = this.server.sockets.sockets.get(chat.partnerId);
    if (partner) {
      await partner.leave(chat.roomId);
      partner.emit(ServerToClientEvents.PARTNER_LEFT, {
        reason: disconnected ? 'Partner disconnected.' : 'Partner moved to next chat.',
      });
    }
  }
}
