import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type QuizQuestion = {
  id: number;
  question: string;
  statement?: string;
  options: string[];
  answer: number;
};

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quiz/generate/`);
      const data = await response.json();

      if (response.ok) {
        setQuestions(data.questions || []);
      } else {
        setQuestions([]);
      }
    } catch {
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, []);

  const handleSelect = (questionId: number, optionIndex: number) => {
    if (submitted) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const score = useMemo(() => {
    return questions.reduce((total, q) => {
      return total + (answers[q.id] === q.answer ? 1 : 0);
    }, 0);
  }, [questions, answers]);

  const answeredCount = Object.keys(answers).length;

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleRetry = async () => {
    setSubmitted(false);
    setAnswers({});
    setIsLoading(true);
    await fetchQuiz();
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quiz</h1>
          <p className="text-muted-foreground">
            Test your understanding of Software Engineering concepts
          </p>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading quiz...</div>
        ) : questions.length === 0 ? (
          <div className="text-muted-foreground">No quiz questions available.</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                Answered: {answeredCount}/{questions.length}
              </Badge>

              {submitted && (
                <Badge variant="default">
                  Score: {score}/{questions.length}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => (
                <Card key={q.id} className="p-5 space-y-4">
                  <div>
                    <h2 className="font-semibold text-foreground">
                      Question {index + 1}
                    </h2>

                    <p className="text-sm text-foreground mt-2">{q.question}</p>

                    {q.statement && (
                      <div className="mt-3 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                        {q.statement}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {q.options.map((option, optionIndex) => {
                      const isSelected = answers[q.id] === optionIndex;
                      const isCorrect = q.answer === optionIndex;

                      let className =
                        'w-full text-left px-4 py-3 rounded-lg border transition-colors';

                      if (submitted) {
                        if (isCorrect) {
                          className += ' border-green-500 bg-green-50 text-green-900';
                        } else if (isSelected && !isCorrect) {
                          className += ' border-red-500 bg-red-50 text-red-900';
                        } else {
                          className += ' border-border bg-background';
                        }
                      } else {
                        className += isSelected
                          ? ' border-primary bg-primary/5'
                          : ' border-border hover:bg-muted/50';
                      }

                      return (
                        <button
                          key={optionIndex}
                          className={className}
                          onClick={() => handleSelect(q.id, optionIndex)}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              {!submitted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={answeredCount !== questions.length}
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button onClick={handleRetry}>Generate New Quiz</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}