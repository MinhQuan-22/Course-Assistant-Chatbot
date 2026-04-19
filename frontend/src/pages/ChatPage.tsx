import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatMessage } from '@/types';
import { ChatMessageBubble } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type BackendSource = {
  document_name?: string;
  chunk_index?: number;
  page?: number;
};

type BackendMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources_json?: BackendSource[] | string | null;
  created_at: string;
};

type Subject = {
  id: number;
  name: string;
  code: string;
  class_section_id: number;
  class_name: string;
};

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConversationId = searchParams.get('conversation_id');
  const isNewChat = searchParams.get('new') === 'true';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(true);
  const [model, setModel] = useState('gpt-3.5');
  
  const [conversationId, setConversationId] = useState<number | null>(() => {
    if (isNewChat) {
      sessionStorage.removeItem('active_conversation_id');
      return null;
    }
    if (initialConversationId) return Number(initialConversationId);
    
    // Fallback to session storage if casully navigating back to Chat tab
    const saved = sessionStorage.getItem('active_conversation_id');
    return saved ? Number(saved) : null;
  });

  // Track conversation state to sessionStorage
  useEffect(() => {
    if (conversationId) {
      sessionStorage.setItem('active_conversation_id', conversationId.toString());
      if (searchParams.get('conversation_id') !== conversationId.toString()) {
        setSearchParams({ conversation_id: conversationId.toString() }, { replace: true });
      }
    } else {
      sessionStorage.removeItem('active_conversation_id');
    }
  }, [conversationId, searchParams, setSearchParams]);

  // Handle direct switch to '?new=true' without component unmount
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setConversationId(null);
      setMessages([]);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem('token');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch student subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/student/subjects/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && data.subjects) {
          setSubjects(data.subjects);
          if (data.subjects.length > 0) {
            setSelectedSubject(data.subjects[0]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubjectsLoading(false);
      }
    };
    if (token) fetchSubjects();
  }, [token]);

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
    if (!user?.id || !selectedSubject) return;

    setIsLoading(true);

    const tempUserMsgId = Date.now().toString();
    const tempAsstMsgId = (Date.now() + 1).toString();

    // Pre-insert messages for instant UI feedback
    setMessages((prev) => [
      ...prev,
      { id: tempUserMsgId, role: 'user', content, timestamp: new Date() },
      { id: tempAsstMsgId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true }
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/send-stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: Number(user.id),
          conversation_id: conversationId,
          content,
          model,
          subject_id: selectedSubject.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream');

      let currentAssistantContent = "";
      let asstId = tempAsstMsgId;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value, { stream: true });
        const events = chunkStr.split('\n\n').filter(e => e.trim().startsWith('data: '));
        
        for (const event of events) {
          const dataStr = event.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'init') {
              setConversationId(data.conversation_id);
              asstId = String(data.assistant_message_id);
              setMessages(prev => prev.map(m => {
                if (m.id === tempUserMsgId) return { ...m, id: String(data.user_message_id) };
                if (m.id === tempAsstMsgId) return { ...m, id: asstId };
                return m;
              }));
            } else if (data.type === 'chunk') {
              currentAssistantContent += data.text;
              setMessages(prev => prev.map(m => {
                if (m.id === tempAsstMsgId || m.id === asstId) {
                  return { ...m, content: currentAssistantContent };
                }
                return m;
              }));
            } else if (data.type === 'end') {
              setMessages(prev => prev.map(m => {
                if (m.id === tempAsstMsgId || m.id === asstId) {
                  return { 
                    ...m, 
                    isStreaming: false,
                    sources: normalizeSources(data.sources_json)
                  };
                }
                return m;
              }));
            }
          } catch (e) {
            console.error("Parse error on stream event:", e);
          }
        }
      }
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

  if (isSubjectsLoading) {
    return <div className="flex w-full h-full justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          {subjects.length > 0 ? (
            <select 
              className="bg-transparent text-sm font-medium text-foreground p-1 border rounded outline-none focus:ring-1 focus:ring-primary"
              value={selectedSubject?.id || ''}
              onChange={(e) => {
                const subId = Number(e.target.value);
                setSelectedSubject(subjects.find(s => s.id === subId) || null);
              }}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.class_name})</option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium text-destructive">Chưa đăng ký môn học nào</span>
          )}
        </div>
        <ModelSelector value={model} onChange={setModel} />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
             <AlertCircle className="w-8 h-8" />
             <p>Bạn cần được Admin phân vào ít nhất một lớp học để sử dụng Chat AI.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {isLoading && messages.length === 0 ? (
              <div className="text-muted-foreground">Đang tải cuộc hội thoại...</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Xin chào 👋</h2>
                <p className="text-muted-foreground max-w-md">
                  Tôi là trợ lý AI phụ trách môn <strong>{selectedSubject?.name}</strong>.
                  <br />Bạn có thể hỏi bài hoặc yêu cầu làm trắc nghiệm ôn tập.
                </p>
                <div className="flex flex-wrap gap-2 mt-6 justify-center">
                  {[
                    'Khái niệm quan trọng là gì?',
                    'Tạo cho tôi 5 câu hỏi ôn tập',
                    'Lịch thi cuối kỳ là bao giờ?',
                    'Bạn có lời khuyên gì khi học môn này?',
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
        )}
      </div>

      {subjects.length > 0 && (
        <ChatInput onSend={handleSend} disabled={isLoading} />
      )}
    </div>
  );
}