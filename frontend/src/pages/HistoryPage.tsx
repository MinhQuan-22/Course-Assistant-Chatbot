import { MessageSquare, Clock, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Conversation } from '@/types';

const mockConversations: Conversation[] = [
  { id: '1', title: 'Design Patterns là gì?', courseId: '1', courseName: 'Kỹ thuật Phần mềm', lastMessage: 'Design Patterns là các giải pháp tái sử dụng...', updatedAt: new Date('2025-04-10T10:30:00'), messageCount: 6 },
  { id: '2', title: 'So sánh Agile và Waterfall', courseId: '1', courseName: 'Kỹ thuật Phần mềm', lastMessage: 'Agile linh hoạt hơn Waterfall ở chỗ...', updatedAt: new Date('2025-04-09T15:20:00'), messageCount: 4 },
  { id: '3', title: 'Nguyên tắc SOLID', courseId: '1', courseName: 'Kỹ thuật Phần mềm', lastMessage: 'SOLID gồm 5 nguyên tắc thiết kế...', updatedAt: new Date('2025-04-08T09:10:00'), messageCount: 8 },
  { id: '4', title: 'UML Class Diagram', courseId: '1', courseName: 'Kỹ thuật Phần mềm', lastMessage: 'Class diagram mô tả cấu trúc tĩnh...', updatedAt: new Date('2025-04-07T14:00:00'), messageCount: 5 },
  { id: '5', title: 'Kiểm thử phần mềm', courseId: '1', courseName: 'Kỹ thuật Phần mềm', lastMessage: 'Có nhiều mức kiểm thử: Unit, Integration...', updatedAt: new Date('2025-04-06T11:00:00'), messageCount: 3 },
];

export default function HistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Lịch sử Chat</h1>
        <p className="text-muted-foreground mb-6">Xem lại các cuộc trò chuyện về Kỹ thuật Phần mềm</p>

        <div className="space-y-3">
          {mockConversations.map((conv) => (
            <Card key={conv.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/chat')}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{conv.title}</h3>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-7 w-7" onClick={(e) => e.stopPropagation()}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{conv.updatedAt.toLocaleDateString('vi-VN')}</span>
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
