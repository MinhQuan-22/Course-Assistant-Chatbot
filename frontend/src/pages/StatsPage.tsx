import { useEffect, useState } from 'react';
import { BarChart3, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

interface StudentStat {
  id: number;
  name: string;
  quizzes: number;
  avgScore: number;
  messages: number;
}

interface StatsResponse {
  summary: {
    activeStudents: number;
    avgQuizScore: number;
    totalQuestions: number;
  };
  students: StudentStat[];
}

export default function StatsPage() {
  const { token, user } = useAuth();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        setError('');

        const response = await fetch(`${API_BASE_URL}/stats/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Cannot load statistics');
          return;
        }

        setStats(data);
      } catch {
        setError('Cannot connect to server');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="p-6 text-center text-muted-foreground">
          This page is only available for teacher or admin.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Class Statistics</h1>
        <p className="text-muted-foreground mb-6">View student learning progress</p>

        {isLoading && (
          <Card className="p-4 text-sm text-muted-foreground mb-6">
            Loading statistics...
          </Card>
        )}

        {error && (
          <Card className="p-4 text-sm text-destructive border-destructive/20 bg-destructive/5 mb-6">
            {error}
          </Card>
        )}

        {!isLoading && !error && stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Active students</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.summary.activeStudents}</p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Average quiz score</span>
                  <TrendingUp className="w-4 h-4 text-accent" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.summary.avgQuizScore}%</p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total questions</span>
                  <MessageSquare className="w-4 h-4 text-warning" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.summary.totalQuestions}</p>
              </Card>
            </div>

            <Card>
              <div className="p-4 border-b">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Student Details
                </h2>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center">Quizzes</TableHead>
                    <TableHead className="text-center">Average score</TableHead>
                    <TableHead className="text-center">Messages</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {stats.students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">{s.quizzes}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            s.avgScore >= 80
                              ? 'text-success font-medium'
                              : s.avgScore >= 60
                              ? 'text-warning font-medium'
                              : 'text-destructive font-medium'
                          }
                        >
                          {s.avgScore}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{s.messages}</TableCell>
                    </TableRow>
                  ))}

                  {stats.students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No student statistics yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}