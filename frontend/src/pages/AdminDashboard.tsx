import { Users, FileText, MessageSquare, TrendingUp, BookOpen, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/card';

const stats = [
  { label: 'Sinh viên', value: '38', icon: Users, color: 'text-primary' },
  { label: 'Tài liệu', value: '8', icon: FileText, color: 'text-accent' },
  { label: 'Tin nhắn hôm nay', value: '87', icon: MessageSquare, color: 'text-warning' },
  { label: 'Bài trắc nghiệm', value: '12', icon: ClipboardList, color: 'text-success' },
  { label: 'Tỉ lệ trả lời đúng', value: '79%', icon: TrendingUp, color: 'text-primary' },
  { label: 'Chương đã cover', value: '6/8', icon: BookOpen, color: 'text-accent' },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Tổng quan – Kỹ thuật Phần mềm</h1>
        <p className="text-muted-foreground mb-6">Bảng điều khiển quản trị</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
