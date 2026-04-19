import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type QuizItem = {
  id: number;
  title: string;
  subject_name: string;
  question_count: number;
  attempts: number;
  best_score: number | null;
};

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
};

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const token = localStorage.getItem('token');

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/student/quizzes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setQuizzes(data.quizzes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchQuizzes();
  }, [token]);

  const handleStartQuiz = async (quizId: number) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/student/quizzes/${quizId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        setActiveQuizId(quizId);
        setAnswers({});
        setResult(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (questionId: number, optionIndex: number) => {
    if (result) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!activeQuizId) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/student/quizzes/${activeQuizId}/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;

  if (isLoading && quizzes.length === 0) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  // ────────────────── MASTER VIEW (LIST QUIZZES) ──────────────────
  if (!activeQuizId) {
    return (
      <div className="p-6 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bài Kiểm Tra (Quiz)</h1>
            <p className="text-muted-foreground">Danh sách bài tập do Giáo viên giao</p>
          </div>
          
          {quizzes.length === 0 ? (
             <div className="text-center py-10 bg-muted/20 border rounded-xl border-dashed">
               <p className="text-muted-foreground">Bạn chưa có bài kiểm tra nào.</p>
             </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {quizzes.map(q => (
                <Card key={q.id} className="p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="text-lg font-semibold line-clamp-2">{q.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Môn học: {q.subject_name}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge variant="outline">{q.question_count} câu hỏi</Badge>
                      <Badge variant="secondary">Đã làm: {q.attempts} lần</Badge>
                      {q.best_score !== null && (
                        <Badge className={`${q.best_score >= 50 ? 'bg-green-500' : 'bg-red-500'}`}>
                          Điểm cao nhất: {q.best_score}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => handleStartQuiz(q.id)} variant="default">
                    {q.attempts > 0 ? 'Làm lại bài' : 'Bắt đầu làm bài'}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────────────────── DETAIL VIEW (TAKE QUIZ) ──────────────────
  return (
    <div className="p-6 overflow-y-auto h-full relative">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          className="mb-2 -ml-4" 
          onClick={() => { setActiveQuizId(null); fetchQuizzes(); }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-foreground">Đang làm bài</h1>
          <p className="text-muted-foreground">Hãy chọn đáp án đúng nhất cho các câu hỏi sau.</p>
        </div>

        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border">
          <span className="font-medium">
            Đã làm: <span className="text-primary">{answeredCount}/{questions.length}</span> câu
          </span>
          {result && (
            <Badge className={`text-sm px-3 py-1 ${result.score >= 50 ? 'bg-green-500' : 'bg-red-500'}`}>
              Điểm số: {result.score}% ({result.correct_count}/{result.total})
            </Badge>
          )}
        </div>

        <div className="space-y-6">
          {questions.map((q, index) => {
            const detail = result?.details?.find((d: any) => d.question_id === q.id);
            
            return (
              <Card key={q.id} className={`p-6 space-y-4 ${detail ? (detail.is_correct ? 'border-green-200 bg-green-50/10' : 'border-red-200 bg-red-50/10') : ''}`}>
                <div>
                  <h3 className="font-medium text-lg">Câu {index + 1}: {q.question}</h3>
                </div>

                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = answers[q.id] === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);
                    
                    let className = 'w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center gap-3 ';
                    
                    if (result) {
                      const isCorrectAnswer = detail.correct_answer === letter;
                      if (isCorrectAnswer) {
                        className += 'border-green-500 bg-green-100 dark:bg-green-900/30 font-medium text-green-900 dark:text-green-100';
                      } else if (isSelected && !isCorrectAnswer) {
                        className += 'border-red-500 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100';
                      } else {
                        className += 'opacity-50 border-border bg-background';
                      }
                    } else {
                      className += isSelected ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border hover:bg-muted/50';
                    }

                    return (
                      <button
                        key={optIdx}
                        className={className}
                        onClick={() => handleSelect(q.id, optIdx)}
                        disabled={!!result}
                      >
                        <span className="font-bold w-6">{letter}.</span> {option}
                      </button>
                    );
                  })}
                </div>
                
                {result && detail && !detail.is_correct && detail.explanation && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 rounded text-sm">
                    <strong>Giải thích:</strong> {detail.explanation}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {!result && (
          <div className="flex justify-end pt-4">
            <Button 
              size="lg" 
              onClick={handleSubmit} 
              disabled={answeredCount !== questions.length || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Nộp Bài Chấm Điểm
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}