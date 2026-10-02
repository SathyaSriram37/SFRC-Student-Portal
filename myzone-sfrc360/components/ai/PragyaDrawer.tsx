'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { apiPost } from '@/lib/api-client';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  buttons?: string[];
  sources?: string[];
  intent?: string | null;
  timestamp: string;
}

interface ChatApiResponse {
  reply: string;
  conversation_id: string;
  sources?: string[];
  intent?: string | null;
  buttons?: string[];
}

const DEFAULT_BUTTONS = ['Admissions', 'Departments', 'Fees', 'Faculty', 'PhD Guides', 'Transport', 'Contact'];

const DEFAULT_WELCOME_MESSAGE =
  `Hello 👋 <b>Welcome to The Standard Fireworks Rajaratnam College for Women!</b><br>` +
  `I'm <b>Pragya</b>, your AI guide.<br>` +
  `I can help you with:<br>` +
  `🎓 <a href="#" data-suggestion="admissions">Admissions</a><br>` +
  `🏛 <a href="#" data-suggestion="departments">Departments</a><br>` +
  `💰 <a href="#" data-suggestion="fees">Fees</a><br>` +
  `👩🏻‍🏫 <a href="#" data-suggestion="faculty">Faculty</a><br>` +
  `👨🏻‍🎓 <a href="#" data-suggestion="phd guides">Ph.D Guides</a><br>` +
  `🚌 <a href="#" data-suggestion="transport">Transport</a><br>` +
  `📞 <a href="#" data-suggestion="contact">Contact</a>`;

export default function PragyaDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: DEFAULT_WELCOME_MESSAGE,
      buttons: DEFAULT_BUTTONS,
      sources: ['SFRC Institutional Guide'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom();
    }, 100);
  }, [scrollToBottom]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeChat();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeChat]);

  const handleSendMessageRef = useRef<((text?: string) => Promise<void>) | null>(null);

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      openChat();
      if (customEvent.detail?.prompt && handleSendMessageRef.current) {
        setTimeout(() => handleSendMessageRef.current!(customEvent.detail!.prompt), 200);
      }
    };
    window.addEventListener('open-pragya-drawer', handleOpenEvent);
    return () => window.removeEventListener('open-pragya-drawer', handleOpenEvent);
  }, [openChat]);

  const removeOldQuickButtons = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) => (m.sender === 'assistant' ? { ...m, buttons: [] } : m))
    );
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const queryText = (textToSend || input).trim();
      if (!queryText || isSending) return;

      removeOldQuickButtons();
      setIsSending(true);
      setIsLoading(true);

      const userMessage: Message = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await apiPost<ChatApiResponse>(
          '/api/v1/pragya/chat',
          { message: queryText, conversation_id: conversationId || undefined },
          token
        );

        if (response.conversation_id) setConversationId(response.conversation_id);

        const botMessage: Message = {
          id: `b-${Date.now()}`,
          sender: 'assistant',
          text: response.reply,
          buttons: response.buttons || [],
          sources: response.sources || [],
          intent: response.intent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMessage]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: '⚠ Unable to connect to server. Please try again.',
            buttons: DEFAULT_BUTTONS,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsSending(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [input, isSending, conversationId, supabase, removeOldQuickButtons]
  );

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleBotMessageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        e.preventDefault();
        const aTag = (target.tagName === 'A' ? target : target.closest('a')) as HTMLAnchorElement | null;
        const suggestion = aTag?.getAttribute('data-suggestion') || aTag?.textContent?.trim();
        if (suggestion) handleSendMessage(suggestion);
      }
    },
    [handleSendMessage]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); }
    },
    [handleSendMessage]
  );

  return (
    <>
      {!isOpen && (
        <div className="chat-launcher-wrap" id="chatTriggerWrap">
          <button type="button" className="chat-trigger" id="chatTrigger" onClick={openChat} aria-label="Open Pragya chatbot">
            <Image src="/images/pragya/Pragya-logo-maroon.png" alt="Pragya logo" width={120} height={120} className="trigger-logo" priority />
          </button>
          <button type="button" className="chat-label" onClick={openChat} aria-label="Open Pragya chatbot">
            Ask Pragya
          </button>
        </div>
      )}

      {isOpen && (
        <div className="chat-overlay active" id="chatOverlay" onClick={closeChat} aria-hidden="true" />
      )}

      {isOpen && (
        <div className="chat-wrapper active" id="chatWrapper">
          <div className="chat-container" id="chat-container" role="dialog" aria-modal="true" aria-labelledby="chat-title">
            <div className="header">
              <Image src="/images/pragya/SFR-logo.jpg" alt="SFRC logo" width={54} height={54} className="logo" />
              <div>
                <h2 id="chat-title">SFRC Assist</h2>
                <p style={{ fontSize: '13px', opacity: 0.92 }}>Pragya AI Guide</p>
              </div>
              <button type="button" className="close-btn" onClick={closeChat} aria-label="Close chatbot">✕</button>
            </div>

            <div id="chat-box" ref={chatBoxRef}>
              {messages.map((m) => (
                <div key={m.id}>
                  <div
                    className={m.sender === 'user' ? 'user' : 'bot'}
                    onClick={m.sender === 'assistant' ? handleBotMessageClick : undefined}
                    dangerouslySetInnerHTML={{ __html: m.text }}
                  />
                  {m.buttons && m.buttons.length > 0 && (
                    <div className="quick-buttons">
                      {m.buttons.map((btn, idx) => (
                        <button key={idx} type="button" onClick={() => handleSendMessage(btn)}>
                          {btn}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="bot" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#7B4019', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
                  <span>Pragya is thinking…</span>
                </div>
              )}
            </div>

            <div className="input-area">
              <input
                ref={inputRef}
                type="text"
                id="message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask your queries..."
                aria-label="Type your message"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isSending || !input.trim()}
                style={{ opacity: (isSending || !input.trim()) ? 0.6 : 1 }}
              >
                Send
              </button>
            </div>
          </div>

          <div className="pragya-blink">
            <Image src="/images/pragya/pragya-maroon.png" alt="Pragya mascot" width={260} height={450} className="pragya pragya-open" priority />
            <Image src="/images/pragya/Pragya-closed-maroon.png" alt="Pragya mascot closed" width={260} height={450} className="pragya pragya-closed" priority />
          </div>
        </div>
      )}
    </>
  );
}

export function openPragyaDrawer(initialPrompt?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pragya-drawer', { detail: { prompt: initialPrompt } }));
  }
}
