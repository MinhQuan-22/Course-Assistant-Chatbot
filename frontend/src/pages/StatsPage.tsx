import { BarChart3, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const studentStats = [
  { name: 'Nguyễn Văn An', quizzes: 5, avgScore: 85, messages: 42 },
  { name: 'Trần Thị Bình', quizzes: 3, avgScore: 72, messages: 28 },
  { name: 'Lê Hoàng Cường', quizzes: 7, avgScore: 91, messages: 56 },
  { name: 'Phạm Minh Đức', quizzes: 4, avgScore: 68, messages: 35 },
];

export default function StatsPage() {
  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Thống kê lớp học</h1>
        <p className="text-muted-foreground mb-6">Xem tình hình học tập của sinh viên</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tổng SV hoạt động</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">38</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Điểm TB trắc nghiệm</span>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">79%</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tổng câu hỏi</span>
              <MessageSquare className="w-4 h-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-foreground">161</p>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Chi tiết sinh viên</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sinh viên</TableHead>
                <TableHead className="text-center">Bài trắc nghiệm</TableHead>
                <TableHead className="text-center">Điểm TB</TableHead>
                <TableHead className="text-center">Số tin nhắn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentStats.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-center">{s.quizzes}</TableCell>
                  <TableCell className="text-center">
                    <span className={s.avgScore >= 80 ? 'text-success font-medium' : s.avgScore >= 60 ? 'text-warning font-medium' : 'text-destructive font-medium'}>
                      {s.avgScore}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{s.messages}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
