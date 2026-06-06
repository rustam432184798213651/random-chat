import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

type ActiveChat = {
  roomId: string;
  partnerId: string;
  sessionId?: string;
};

@Injectable()
export class MatchmakingService {
  private readonly waitingUsers = new Set<string>();
  private readonly activeChats = new Map<string, ActiveChat>();

  findMatch(socketId: string): { partnerId: string; roomId: string } | null {
    this.waitingUsers.delete(socketId);

    const partnerId = [...this.waitingUsers].find((id) => id !== socketId);
    if (!partnerId) {
      this.waitingUsers.add(socketId);
      return null;
    }

    this.waitingUsers.delete(partnerId);
    const roomId = `room_${randomUUID()}`;

    this.activeChats.set(socketId, { roomId, partnerId });
    this.activeChats.set(partnerId, { roomId, partnerId: socketId });

    return { partnerId, roomId };
  }

  setSessionId(socketId: string, sessionId: string) {
    const chat = this.activeChats.get(socketId);
    const partner = chat ? this.activeChats.get(chat.partnerId) : undefined;

    if (chat) this.activeChats.set(socketId, { ...chat, sessionId });
    if (partner) this.activeChats.set(chat!.partnerId, { ...partner, sessionId });
  }

  getActiveChat(socketId: string): ActiveChat | undefined {
    return this.activeChats.get(socketId);
  }

  leave(socketId: string): ActiveChat | undefined {
    this.waitingUsers.delete(socketId);
    const chat = this.activeChats.get(socketId);

    if (chat) {
      this.activeChats.delete(socketId);
      this.activeChats.delete(chat.partnerId);
    }

    return chat;
  }

  stopSearch(socketId: string) {
    this.waitingUsers.delete(socketId);
  }
}
