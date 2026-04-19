import { useEffect, useState } from 'react';
import { BarChart3, Users, MessageSquare, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type StudentStat = {
  student_id: number;
  name: string;
  student_code: string;
  class_name: string;
  quizzes: number;
  avgScore: number;
  messages: number;
};

type StatsSummary = {
  total_students: number;
  avg_score: number;
  total_messages: number;
};

export default function StatsPage() {
  const { token, user } = useAuth();
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [summary, setSummary] = useState<StatsSummary>({ total_students: 0, avg_score: 0, total_messages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/teacher/stats/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          setStudents(data.students);
          setSummary(data.summary);
        } else {
          setError(data.error || 'Failed to load stats');
        }
      } catch (e: any) {
        setError('Network error: ' + e.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive gap-4">
        <AlertCircle className="w-12 h-12" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Thống kê lớp học</h1>
        <p className="text-muted-foreground mb-6">
          Xem tình hình học tập của sinh viên {user?.role === 'teacher' ? 'trong các lớp bạn phụ trách' : ''}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tổng SV</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{summary.total_students}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Điểm TB trắc nghiệm</span>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{summary.avg_score}%</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tổng tin nhắn chat</span>
              <MessageSquare className="w-4 h-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-foreground">{summary.total_messages}</p>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />Chi tiết sinh viên
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead className="text-center">Số bài làm</TableHead>
                <TableHead className="text-center">Điểm TB</TableHead>
                <TableHead className="text-center">Tin nhắn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chưa có sinh viên nào.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s) => (
                  <TableRow key={s.student_id}>
                    <TableCell className="font-mono text-xs">{s.student_code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.class_name || '-'}</TableCell>
                    <TableCell className="text-center">{s.quizzes}</TableCell>
                    <TableCell className="text-center">
                      <span className={s.avgScore >= 80 ? 'text-success font-medium' : s.avgScore >= 60 ? 'text-warning font-medium' : 'text-destructive font-medium'}>
                        {s.avgScore}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{s.messages}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
