import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function InChatQuiz({ quizData }: { quizData: any[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (idx: number, optionIndex: number) => {
    if (submitted) return;
    setAnswers({ ...answers, [idx]: optionIndex });
  };

  const score = quizData.reduce((total, q, idx) => {
    return total + (answers[idx] === q.answer ? 1 : 0);
  }, 0);

  return (
    <Card className="mt-4 p-4 border shadow-sm w-full bg-background max-w-sm sm:max-w-md">
      <h3 className="font-semibold text-lg border-b pb-2 mb-4 text-primary">📝 Bài tập ôn luyện ({quizData.length} câu)</h3>
      <div className="space-y-6">
        {quizData.map((q, idx) => {
          const isAnswered = answers[idx] !== undefined;
          return (
            <div key={idx} className="space-y-3">
              <p className="font-medium text-sm text-foreground">
                <span className="text-muted-foreground mr-1">Câu {idx + 1}:</span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt: string, optIdx: number) => {
                  const isSelected = answers[idx] === optIdx;
                  const isCorrect = q.answer === optIdx;
                  let btnClass = "w-full text-left p-2 rounded text-sm border transition-colors ";

                  if (submitted) {
                    if (isCorrect) btnClass += "border-success bg-success/10 text-success font-medium";
                    else if (isSelected && !isCorrect) btnClass += "border-destructive bg-destructive/10 text-destructive";
                    else btnClass += "border-border bg-muted/20 text-muted-foreground opacity-50";
                  } else {
                    btnClass += isSelected ? "border-primary bg-primary/10 text-primary font-medium" : "hover:bg-muted border-border";
                  }

                  return (
                    <button
                      key={optIdx}
                      className={btnClass}
                      onClick={() => handleSelect(idx, optIdx)}
                      disabled={submitted}
                    >
                      <span className="inline-block w-6 font-semibold">{String.fromCharCode(65 + optIdx)}.</span> {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <Button 
          className="w-full mt-6" 
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length !== quizData.length}
        >
          Nộp bài để xem kết quả
        </Button>
      ) : (
        <div className="mt-6 p-3 bg-muted/30 rounded-lg border text-center">
          <p className="font-semibold">Bạn đã đạt {score}/{quizData.length} điểm!</p>
        </div>
      )}
    </Card>
  );
}
