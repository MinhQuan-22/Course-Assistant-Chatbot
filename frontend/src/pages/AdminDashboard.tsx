import { useEffect, useState } from 'react';
import { Users, FileText, MessageSquare, BookOpen, Loader2, GraduationCap, LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://127.0.0.1:8000/api';

interface Stats {
  total_students: number;
  total_teachers: number;
  total_admins: number;
  total_subjects: number;
  total_class_sections: number;
  total_documents: number;
  total_conversations: number;
  total_messages: number;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/stats/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const cards = stats
    ? [
        { label: 'Sinh viên',  value: String(stats.total_students),       icon: GraduationCap, color: 'text-primary' },
        { label: 'Giáo viên',  value: String(stats.total_teachers),       icon: Users,         color: 'text-accent' },
        { label: 'Môn học',    value: String(stats.total_subjects),       icon: BookOpen,      color: 'text-indigo-500' },
        { label: 'Lớp học',    value: String(stats.total_class_sections), icon: LayoutGrid,    color: 'text-teal-500' },
        { label: 'Tài liệu',   value: String(stats.total_documents),      icon: FileText,      color: 'text-yellow-500' },
        { label: 'Hội thoại',  value: String(stats.total_conversations),  icon: MessageSquare, color: 'text-green-500' },
        { label: 'Tin nhắn',   value: String(stats.total_messages),       icon: BookOpen,      color: 'text-purple-500' },
      ]
    : [];

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Tổng quan hệ thống</h1>
        <p className="text-muted-foreground mb-6 text-sm">Bảng điều khiển quản trị – Course Assistant 3N</p>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải số liệu...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-3xl font-bold text-foreground">{s.value}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
