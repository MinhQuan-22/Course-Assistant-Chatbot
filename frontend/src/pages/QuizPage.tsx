import { useState } from 'react';
import { ClipboardList, CheckCircle2, XCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QuizQuestion } from '@/types';

const mockQuiz: QuizQuestion[] = [
  { id: '1', question: 'Nguyên tắc nào trong SOLID nói rằng "mỗi class chỉ nên có một lý do để thay đổi"?', options: ['Open/Closed', 'Single Responsibility', 'Liskov Substitution', 'Dependency Inversion'], correctAnswer: 1, explanation: 'Single Responsibility Principle (SRP) – mỗi class chỉ có một trách nhiệm duy nhất.' },
  { id: '2', question: 'Trong Scrum, ai chịu trách nhiệm quản lý Product Backlog?', options: ['Scrum Master', 'Dev Team', 'Product Owner', 'Stakeholder'], correctAnswer: 2, explanation: 'Product Owner chịu trách nhiệm quản lý và ưu tiên hóa Product Backlog.' },
  { id: '3', question: 'Design Pattern nào đảm bảo một class chỉ có duy nhất một instance?', options: ['Factory Method', 'Observer', 'Singleton', 'Strategy'], correctAnswer: 2, explanation: 'Singleton Pattern đảm bảo chỉ có một instance duy nhất của class trong toàn bộ ứng dụng.' },
  { id: '4', question: 'Mô hình Waterfall có đặc điểm nào sau đây?', options: ['Lặp lại nhiều vòng', 'Tuần tự từ trên xuống', 'Không cần tài liệu', 'Phát triển song song'], correctAnswer: 1, explanation: 'Waterfall là mô hình tuần tự, mỗi giai đoạn phải hoàn thành trước khi sang giai đoạn tiếp theo.' },
  { id: '5', question: 'UML Use Case Diagram dùng để mô tả điều gì?', options: ['Cấu trúc lớp', 'Tương tác người dùng với hệ thống', 'Luồng dữ liệu', 'Quan hệ giữa các bảng'], correctAnswer: 1, explanation: 'Use Case Diagram mô tả các chức năng hệ thống từ góc nhìn người dùng (Actor).' },
];

export default function QuizPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qId: string, idx: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: idx }));
  };

  const score = mockQuiz.filter((q) => answers[q.id] === q.correctAnswer).length;

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quiz – Software Engineering</h1>
            <p className="text-muted-foreground">Revise your knowledge with AI-generated quizzes</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Create new quiz
          </Button>
        </div>

        <div className="space-y-4">
          {mockQuiz.map((q, qi) => (
            <Card key={q.id} className="p-5 animate-fade-in" style={{ animationDelay: `${qi * 100}ms` }}>
              <p className="font-medium text-foreground mb-3">
                <span className="text-primary mr-2">Câu {qi + 1}.</span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  const isCorrect = q.correctAnswer === i;
                  let optClass = 'border rounded-lg px-4 py-2.5 text-sm cursor-pointer transition-all ';
                  if (submitted) {
                    if (isCorrect) optClass += 'border-success bg-success/10 text-foreground';
                    else if (selected) optClass += 'border-destructive bg-destructive/10 text-foreground';
                    else optClass += 'border-border text-muted-foreground';
                  } else {
                    optClass += selected ? 'border-primary bg-primary/5 text-foreground' : 'border-border hover:border-primary/50 hover:bg-muted/50 text-foreground';
                  }

                  return (
                    <div key={i} className={optClass} onClick={() => handleSelect(q.id, i)}>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                        {submitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-success ml-auto" />}
                        {submitted && selected && !isCorrect && <XCircle className="w-4 h-4 text-destructive ml-auto" />}
                      </div>
                    </div>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <p className="text-sm text-muted-foreground mt-3 bg-muted/50 rounded-lg p-3">
                  💡 {q.explanation}
                </p>
              )}
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 p-4 bg-card rounded-xl border">
          {submitted ? (
            <>
              <p className="font-semibold text-foreground">
                Result: <span className="text-primary">{score}/{mockQuiz.length}</span> correct quiz
              </p>
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try again
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Chose {Object.keys(answers).length}/{mockQuiz.length} quiz
              </p>
              <Button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < mockQuiz.length}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
