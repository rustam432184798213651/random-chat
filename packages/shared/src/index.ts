export const ClientToServerEvents = {
  FIND_PARTNER: 'find_partner',
  SEND_MESSAGE: 'send_message',
  NEXT_PARTNER: 'next_partner',
  STOP_SEARCH: 'stop_search',
  TYPING: 'typing'
} as const;

export const ServerToClientEvents = {
  SEARCHING: 'searching',
  CHAT_STARTED: 'chat_started',
  NEW_MESSAGE: 'new_message',
  PARTNER_LEFT: 'partner_left',
  PARTNER_TYPING: 'partner_typing',
  ERROR: 'error_message'
} as const;

export type ChatMessage = {
  id: string;
  roomId: string;
  text: string;
  sender: 'you' | 'stranger';
  createdAt: string;
};

export type ChatStartedPayload = {
  roomId: string;
};

export type NewMessagePayload = {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
};
