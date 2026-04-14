import { useEffect, useState } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Conversation } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConversations = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        setError('');

        const response = await fetch(`${API_BASE_URL}/chat/conversations/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Không thể tải lịch sử chat');
          return;
        }

        const normalized: Conversation[] = data.map((item: any) => ({
          id: String(item.id),
          title: item.title,
          courseId: '1',
          courseName: 'Kỹ thuật Phần mềm',
          lastMessage: item.last_message || '',
          updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
          messageCount: item.message_count || 0,
        }));

        setConversations(normalized);
      } catch {
        setError('Không thể kết nối tới server');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [token]);

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Lịch sử Chat</h1>
        <p className="text-muted-foreground mb-6">Xem lại các cuộc trò chuyện về Kỹ thuật Phần mềm</p>

        {isLoading && (
          <Card className="p-4 text-sm text-muted-foreground">
            Đang tải lịch sử chat...
          </Card>
        )}

        {error && (
          <Card className="p-4 text-sm text-destructive border-destructive/20 bg-destructive/5">
            {error}
          </Card>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            Chưa có cuộc trò chuyện nào cho tài khoản này.
          </Card>
        )}

        <div className="space-y-3">
          {conversations.map((conv) => (
            <Card
              key={conv.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate('/chat')}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {conv.title}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage || 'Chưa có nội dung'}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {conv.updatedAt.toLocaleDateString('vi-VN')}
                    </span>
                    <span>{conv.messageCount} tin nhắn</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}