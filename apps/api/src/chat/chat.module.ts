import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MatchmakingService } from './matchmaking.service';

@Module({
  providers: [ChatGateway, ChatService, MatchmakingService],
})
export class ChatModule {}
