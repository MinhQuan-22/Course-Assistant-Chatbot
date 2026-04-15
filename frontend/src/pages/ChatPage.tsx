import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatMessage } from '@/types';
import { ChatMessageBubble } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { BookOpen } from 'lucide-react';

const COURSE_NAME = 'Software Engineering';
const API_BASE_URL = 'http://127.0.0.1:8000/api';

type BackendSource = {
  document_name?: string;
  chunk_index?: number;
};

type BackendMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources_json?: BackendSource[] | string | null;
  created_at: string;
};

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get('conversation_id');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('gpt-3.5');
  const [conversationId, setConversationId] = useState<number | null>(
    initialConversationId ? Number(initialConversationId) : null
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const normalizeSources = (
    rawSources?: BackendSource[] | string | null
  ): BackendSource[] | undefined => {
    if (!rawSources) return undefined;

    if (Array.isArray(rawSources)) return rawSources;

    if (typeof rawSources === 'string') {
      try {
        const parsed = JSON.parse(rawSources);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }

    return undefined;
  };

  useEffect(() => {
    const fetchConversationMessages = async () => {
      if (!conversationId) return;

      try {
        setIsLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/chat/conversations/${conversationId}/`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load conversation');
        }

        const mappedMessages: ChatMessage[] = data.messages.map((msg: BackendMessage) => ({
          id: String(msg.id),
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          sources: normalizeSources(msg.sources_json),
        }));

        setMessages(mappedMessages);
      } catch {
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversationMessages();
  }, [conversationId]);

  const handleSend = async (content: string) => {
    if (!user?.id) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: Number(user.id),
          conversation_id: conversationId,
          content,
          model,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setConversationId(data.conversation_id);

      const newMessages: ChatMessage[] = [
        {
          id: String(data.user_message.id),
          role: 'user',
          content: data.user_message.content,
          timestamp: new Date(data.user_message.created_at),
        },
        {
          id: String(data.assistant_message.id),
          role: 'assistant',
          content: data.assistant_message.content,
          timestamp: new Date(data.assistant_message.created_at),
          sources: normalizeSources(data.assistant_message.sources_json),
        },
      ];

      setMessages((prev) => [...prev, ...newMessages]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Could not connect to chat server.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{COURSE_NAME}</span>
        </div>
        <ModelSelector value={model} onChange={setModel} />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {isLoading && messages.length === 0 ? (
            <div className="text-muted-foreground">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Hello 👋</h2>
              <p className="text-muted-foreground max-w-md">
                I am your AI assistant for <strong>{COURSE_NAME}</strong>.
                Ask me anything about the course content.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {[
                  'What are design patterns?',
                  'Explain SOLID principles',
                  'Compare Agile and Waterfall',
                  'What is UML?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="px-4 py-2 text-sm rounded-full border bg-card hover:bg-muted transition-colors text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}