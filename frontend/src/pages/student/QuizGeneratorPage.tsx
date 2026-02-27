//src\pages\student\QuizGeneratorPage.tsx
import { useMemo, useState } from "react";
import micIcon from "../../assets/icon_mic.png";
import sendIcon from "../../assets/search_chatbot.png";
import botIcon from "../../assets/chatbot.png";

type QuizOption = {
  id: string;
  label: string;
};

type QuizQuestion = {
  id: string;
  title: string; // e.g. "Which language uses OOP method?"
  options: QuizOption[];
};

export default function QuizGeneratorPage() {
  const questions = useMemo<QuizQuestion[]>(
    () => [
      {
        id: "q1",
        title: "Which language uses OOP method?",
        options: [
          { id: "a", label: "Java" },
          { id: "b", label: "HTML" },
          { id: "c", label: "CSS" },
        ],
      },
      {
        id: "q2",
        title: "Which language uses OOP method?",
        options: [
          { id: "a", label: "Java" },
          { id: "b", label: "HTML" },
          { id: "c", label: "CSS" },
        ],
      },
      {
        id: "q3",
        title: "Which language uses OOP method?",
        options: [
          { id: "a", label: "Java" },
          { id: "b", label: "HTML" },
          { id: "c", label: "CSS" },
        ],
      },
    ],
    [],
  );

  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const toggleOption = (questionId: string, optionId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[questionId] ?? []);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      next[questionId] = set;
      return next;
    });
  };

  const handleSubmit = (questionId: string) => {
    // UI only
    console.log("submit", questionId, Array.from(selected[questionId] ?? []));
  };

  const handleSkip = (questionId: string) => {
    // UI only
    console.log("skip", questionId);
  };


  return (
    <div className="quiz-page">
      {/* top input bar */}
      <div className="quiz-create">
        <button className="quiz-ico-btn" type="button" aria-label="Mic">
          <img src={micIcon} alt="" />
        </button>

        <input className="quiz-create-input" placeholder="Create Quiz" />

        <button className="quiz-ico-btn quiz-send" type="button" aria-label="Send">
          <img src={sendIcon} alt="" />
        </button>
      </div>

      <div className="quiz-disclaimer">
        Disclaimer: All of your quiz results will be submitted to your teacher. So, please take quiz more
        carefully.
      </div>

      {/* list of question cards */}
      <div className="quiz-list">
        {questions.map((q, idx) => {
          const qIndex = idx + 1;
          const chosen = selected[q.id] ?? new Set<string>();

          return (
            <section key={q.id} className="quiz-card">
              <div className="quiz-card-header">
                <img className="quiz-avatar" src={botIcon} alt="" />
                <div className="quiz-header-text">
                  <div className="quiz-header-title">
                    Question {qIndex} of {questions.length}
                  </div>
                </div>
              </div>

              <div className="quiz-question-box">
                <div className="quiz-question-title">{q.title}</div>

                <div className="quiz-options">
                  {q.options.map((opt) => {
                    const checked = chosen.has(opt.id);
                    return (
                      <label key={opt.id} className="quiz-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOption(q.id, opt.id)}
                        />
                        <span className="quiz-option-label">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="quiz-actions">
                <button className="quiz-btn quiz-btn-primary" onClick={() => handleSubmit(q.id)}>
                  Submit
                </button>
                <button className="quiz-btn quiz-btn-ghost" onClick={() => handleSkip(q.id)}>
                  Skip
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}