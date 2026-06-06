'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMessage,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@random-chat/shared';
import { getSocket } from '../lib/socket';

type Status = 'idle' | 'searching' | 'chatting';

type SystemMessage = {
  id: string;
  type: 'system';
  text: string;
};

type TimelineItem = ChatMessage | SystemMessage;

export default function Home() {
  const socket = useMemo(() => getSocket(), []);
  const [status, setStatus] = useState<Status>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log('socket connected', socket.id);
    });

    socket.on(ServerToClientEvents.SEARCHING, () => {
      setStatus('searching');
      setRoomId(null);
      setTimeline([]);
    });

    socket.on(ServerToClientEvents.CHAT_STARTED, (payload: { roomId: string }) => {
      setStatus('chatting');
      setRoomId(payload.roomId);
      setPartnerTyping(false);
      setTimeline([
        {
          id: crypto.randomUUID(),
          type: 'system',
          text: 'Your chat partner joined. Say hi!',
        },
      ]);
    });

    socket.on(ServerToClientEvents.NEW_MESSAGE, (payload) => {
      setPartnerTyping(false);
      setTimeline((current) => [
        ...current,
        {
          id: payload.id,
          roomId: payload.roomId,
          text: payload.text,
          sender: 'stranger',
          createdAt: payload.createdAt,
        },
      ]);
    });

    socket.on(ServerToClientEvents.PARTNER_LEFT, (payload: { reason?: string }) => {
      setStatus('idle');
      setRoomId(null);
      setPartnerTyping(false);
      setTimeline((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          type: 'system',
          text: payload.reason ?? 'Partner left.',
        },
      ]);
    });

    socket.on(ServerToClientEvents.PARTNER_TYPING, (payload: { isTyping: boolean }) => {
      setPartnerTyping(payload.isTyping);
    });

    socket.on(ServerToClientEvents.ERROR, (payload: { message: string }) => {
      setTimeline((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          type: 'system',
          text: payload.message,
        },
      ]);
    });

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline, partnerTyping]);

  function startChat() {
    setStatus('searching');
    setTimeline([]);
    socket.emit(ClientToServerEvents.FIND_PARTNER);
  }

  function nextChat() {
    setStatus('searching');
    setMessageText('');
    setPartnerTyping(false);
    setTimeline([]);
    socket.emit(ClientToServerEvents.NEXT_PARTNER);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || status !== 'chatting' || !roomId) return;

    const now = new Date().toISOString();
    setTimeline((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        roomId,
        text,
        sender: 'you',
        createdAt: now,
      },
    ]);

    socket.emit(ClientToServerEvents.SEND_MESSAGE, { text });
    socket.emit(ClientToServerEvents.TYPING, { isTyping: false });
    setMessageText('');
  }

  function handleInputChange(value: string) {
    setMessageText(value);

    if (status !== 'chatting') return;

    socket.emit(ClientToServerEvents.TYPING, { isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(ClientToServerEvents.TYPING, { isTyping: false });
    }, 800);
  }

  const readableStatus = {
    idle: 'Not connected',
    searching: '',
    chatting: '',
  }[status];

  return (
    <main className="page">
      <section className="chat-shell">
        <header className="header">
          <div className="brand">
            <div className="title">Random Chat</div>
            {status !== 'idle' && <div className="status">{readableStatus}</div>}
          </div>
          {status === 'chatting' ? (
            <button className="btn danger" onClick={nextChat}>Next</button>
          ) : (
            <button className="btn" onClick={startChat} disabled={status === 'searching'}>
              Start Chat
            </button>
          )}
        </header>

        <div className="main">
          {status === 'idle' && timeline.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="presentation" focusable="false">
                  <path d="M12 14h28a8 8 0 0 1 8 8v11a8 8 0 0 1-8 8H28l-10 9v-9h-6a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8Z" />
                  <path d="M28 28h24a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8h-4v8l-8-8H28a8 8 0 0 1-8-8v-8a8 8 0 0 1 8-8Z" />
                  <circle cx="22" cy="28" r="2.5" />
                  <circle cx="31" cy="28" r="2.5" />
                  <circle cx="40" cy="28" r="2.5" />
                  <circle cx="37" cy="42" r="2.5" />
                  <circle cx="46" cy="42" r="2.5" />
                  <circle cx="55" cy="42" r="2.5" />
                </svg>
              </div>
            </div>
          )}

          {status === 'searching' && (
            <div className="empty-state">
              <div className="loader" />
              <h1>Searching...</h1>
              <button
                className="btn secondary"
                onClick={() => {
                  socket.emit(ClientToServerEvents.STOP_SEARCH);
                  setStatus('idle');
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {(status === 'chatting' || timeline.length > 0) && (
            <>
              <div className="messages">
                {timeline.map((item) => {
                  if ('type' in item) {
                    return <div key={item.id} className="system-message">{item.text}</div>;
                  }

                  return (
                    <div key={item.id} className={`message ${item.sender}`}>
                      {item.text}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {partnerTyping && <div className="typing">Stranger is typing...</div>}

              <form className="composer" onSubmit={sendMessage}>
                <input
                  className="input"
                  placeholder={status === 'chatting' ? 'Type a message...' : 'Start a chat first'}
                  value={messageText}
                  onChange={(event) => handleInputChange(event.target.value)}
                  disabled={status !== 'chatting'}
                  maxLength={1000}
                />
                <button className="btn" disabled={status !== 'chatting' || !messageText.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
