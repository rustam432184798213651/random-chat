import { Injectable } from '@nestjs/common';

type ChatSession = {
  id: string;
  roomId: string;
  userAId: string;
  userBId: string;
  startedAt: Date;
  endedAt: Date | null;
};

type ChatMessage = {
  id: string;
  sessionId: string;
  senderId: string;
  text: string;
  createdAt: Date;
};

@Injectable()
export class ChatService {
  private readonly sessions = new Map<string, ChatSession>();
  private readonly messages = new Map<string, ChatMessage[]>();

  async createSession(roomId: string, userAId: string, userBId: string) {
    const session = {
      id: crypto.randomUUID(),
      roomId,
      userAId,
      userBId,
      startedAt: new Date(),
      endedAt: null,
    };

    this.sessions.set(roomId, session);
    this.messages.set(session.id, []);

    return session;
  }

  async endSession(roomId: string) {
    const session = this.sessions.get(roomId);
    if (!session || session.endedAt) return;

    session.endedAt = new Date();
    this.sessions.delete(roomId);
    this.messages.delete(session.id);
  }

  async saveMessage(sessionId: string, senderId: string, text: string) {
    const message = {
      id: crypto.randomUUID(),
      sessionId,
      senderId,
      text,
      createdAt: new Date(),
    };

    const sessionMessages = this.messages.get(sessionId);
    if (!sessionMessages) {
      throw new Error('Session not found.');
    }

    sessionMessages.push(message);
    return message;
  }
}
