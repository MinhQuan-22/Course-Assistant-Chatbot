import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Source } from '@/types';
import { ChatMessageBubble } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { BookOpen } from 'lucide-react';

const COURSE_NAME = 'Kỹ thuật Phần mềm';

const sampleResponses = [
  {
    content: `## Design Patterns trong Kỹ thuật Phần mềm\n\nDesign Patterns là các **giải pháp tái sử dụng** cho những vấn đề thường gặp trong thiết kế phần mềm. Có 3 nhóm chính:\n\n1. **Creational Patterns** – Singleton, Factory, Builder\n2. **Structural Patterns** – Adapter, Decorator, Facade\n3. **Behavioral Patterns** – Observer, Strategy, Command\n\n\`\`\`java\n// Singleton Pattern\npublic class DatabaseConnection {\n    private static DatabaseConnection instance;\n    \n    private DatabaseConnection() {}\n    \n    public static DatabaseConnection getInstance() {\n        if (instance == null) {\n            instance = new DatabaseConnection();\n        }\n        return instance;\n    }\n}\n\`\`\`\n\n> Design Patterns giúp code dễ bảo trì, mở rộng và tuân thủ nguyên tắc SOLID.`,
    sources: [
      { documentName: 'Slide_Chuong5_DesignPatterns.pdf', page: 8, snippet: 'Design Patterns là giải pháp đã được kiểm chứng cho các vấn đề thiết kế phần mềm...' },
      { documentName: 'Giao_trinh_KTPM.pdf', page: 112, snippet: 'Ba nhóm Design Patterns theo GoF: Creational, Structural, Behavioral...' },
    ] as Source[],
  },
  {
    content: `### Quy trình phát triển phần mềm Agile\n\nAgile là phương pháp phát triển phần mềm **linh hoạt**, tập trung vào:\n\n- **Cá nhân và tương tác** hơn quy trình và công cụ\n- **Phần mềm hoạt động** hơn tài liệu đầy đủ\n- **Cộng tác với khách hàng** hơn đàm phán hợp đồng\n- **Phản hồi với thay đổi** hơn tuân theo kế hoạch\n\n#### Scrum Framework\n| Vai trò | Trách nhiệm |\n|---------|-------------|\n| Product Owner | Quản lý Product Backlog |\n| Scrum Master | Hỗ trợ team, loại bỏ trở ngại |\n| Dev Team | Phát triển sản phẩm |\n\nMỗi Sprint thường kéo dài **2-4 tuần**.`,
    sources: [
      { documentName: 'Slide_Chuong2_QuyTrinh.pdf', page: 22, snippet: 'Agile Manifesto ra đời năm 2001 với 4 giá trị cốt lõi...' },
    ] as Source[],
  },
  {
    content: `### Nguyên tắc SOLID\n\nSOLID là 5 nguyên tắc thiết kế hướng đối tượng:\n\n1. **S** – Single Responsibility: Mỗi class chỉ có 1 lý do để thay đổi\n2. **O** – Open/Closed: Mở cho mở rộng, đóng cho sửa đổi\n3. **L** – Liskov Substitution: Lớp con thay thế được lớp cha\n4. **I** – Interface Segregation: Chia nhỏ interface\n5. **D** – Dependency Inversion: Phụ thuộc vào abstraction\n\n\`\`\`python\n# Vi phạm SRP\nclass Report:\n    def calculate(self): ...\n    def format(self): ...\n    def print(self): ...  # Nên tách ra!\n\`\`\``,
    sources: [
      { documentName: 'Slide_Chuong4_ThietKe.pdf', page: 15, snippet: 'SOLID principles giúp thiết kế phần mềm dễ bảo trì...' },
      { documentName: 'Giao_trinh_KTPM.pdf', page: 87, snippet: 'Robert C. Martin đề xuất 5 nguyên tắc SOLID...' },
    ] as Source[],
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('gpt-3.5');
  const bottomRef = useRef<HTMLDivElement>(null);
  const responseIdx = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const simulateStreaming = useCallback((text: string, sources: Source[], msgId: string) => {
    let i = 0;
    const interval = setInterval(() => {
      i += Math.floor(Math.random() * 4) + 2;
      if (i >= text.length) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: text, isStreaming: false, sources } : m
          )
        );
        setIsLoading(false);
        clearInterval(interval);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: text.slice(0, i) } : m
          )
        );
      }
    }, 30);
  }, []);

  const handleSend = (content: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const botId = (Date.now() + 1).toString();
    const botMsg: ChatMessage = {
      id: botId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setIsLoading(true);

    const resp = sampleResponses[responseIdx.current % sampleResponses.length];
    responseIdx.current++;

    setTimeout(() => {
      simulateStreaming(resp.content, resp.sources, botId);
    }, 600);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{COURSE_NAME}</span>
        </div>
        <ModelSelector value={model} onChange={setModel} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Xin chào! 👋</h2>
              <p className="text-muted-foreground max-w-md">
                Tôi là trợ giảng AI cho môn <strong>{COURSE_NAME}</strong>.
                Hãy hỏi tôi bất kỳ câu hỏi nào về nội dung môn học!
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {['Design Patterns là gì?', 'Giải thích nguyên tắc SOLID', 'So sánh Agile vs Waterfall', 'UML diagram là gì?'].map((q) => (
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
          )}

          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
