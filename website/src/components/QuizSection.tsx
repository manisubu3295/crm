import { useState } from "react";
import type { QuizQuestion } from "../data/courses.js";

interface QuizSectionProps {
  questions: QuizQuestion[];
  onEnquire: () => void;
}

export function QuizSection({ questions, onEnquire }: QuizSectionProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const allAnswered = Object.keys(answers).length === questions.length;

  function getResult() {
    if (score === questions.length) return { emoji: "ðŸ†", text: "Perfect score! You're a natural fit for this course.", cta: "Enroll Now" };
    if (score >= Math.ceil(questions.length * 0.6)) return { emoji: "â­", text: `${score}/${questions.length} â€” Good understanding! The course will take you much further.`, cta: "Join the Batch" };
    return { emoji: "ðŸ“š", text: `${score}/${questions.length} â€” This is exactly what the course will teach you, step by step.`, cta: "Start Learning" };
  }

  if (!submitted) {
    return (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {questions.map((q, qi) => (
            <div key={qi} style={{ background: "var(--bg-alt)", borderRadius: 10, padding: "20px 22px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", marginBottom: 14, lineHeight: 1.55 }}>
                <span style={{ color: "var(--green)", marginRight: 6 }}>Q{qi + 1}.</span>
                {q.question}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    className={`quiz-option${answers[qi] === oi ? " selected" : ""}`}
                    onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      border: `1.5px solid ${answers[qi] === oi ? "var(--green)" : "var(--border-2)"}`,
                      background: answers[qi] === oi ? "var(--green)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      color: answers[qi] === oi ? "white" : "var(--text-3)",
                    }}>
                      {["A","B","C","D"][oi]}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ marginTop: 24, width: "100%", justifyContent: "center" }}
          onClick={() => setSubmitted(true)}
          disabled={!allAnswered}
        >
          {allAnswered ? "Submit & See Results â†’" : `Answer all ${questions.length} questions to submit`}
        </button>
      </div>
    );
  }

  const result = getResult();

  return (
    <div>
      {/* Score card */}
      <div style={{
        background: score === questions.length ? "#EFF6FF" : "#F9FAFB",
        border: `1.5px solid ${score === questions.length ? "var(--green)" : "var(--border-2)"}`,
        borderRadius: 12, padding: "28px 28px",
        textAlign: "center", marginBottom: 28,
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>{result.emoji}</div>
        <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--green)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 10 }}>
          {score} / {questions.length}
        </div>
        <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
          {result.text}
        </p>
        <button onClick={onEnquire} className="btn btn-primary btn-lg">
          {result.cta} â†’
        </button>
      </div>

      {/* Answer review */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map((q, qi) => {
          const userAns = answers[qi];
          const correct = userAns === q.correct;
          return (
            <div key={qi} style={{
              background: "var(--white)", borderRadius: 10,
              border: `1.5px solid ${correct ? "#BBF7D0" : "#FECACA"}`,
              padding: "18px 20px",
            }}>
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{correct ? "âœ…" : "âŒ"}</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.5 }}>{q.question}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginLeft: 26 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{
                    fontSize: 13, padding: "7px 11px", borderRadius: 7, display: "flex", gap: 7,
                    background: oi === q.correct ? "#DCFCE7" : oi === userAns && !correct ? "#FEE2E2" : "transparent",
                    color: oi === q.correct ? "#166534" : oi === userAns && !correct ? "#991B1B" : "var(--text-2)",
                  }}>
                    <span style={{ fontWeight: 700, width: 18, flexShrink: 0 }}>{["A","B","C","D"][oi]}.</span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {oi === q.correct && <span style={{ fontWeight: 700, fontSize: 11 }}>âœ“ Correct</span>}
                    {oi === userAns && !correct && <span style={{ fontSize: 11 }}>Your answer</span>}
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 12, marginLeft: 26, fontSize: 13,
                color: "var(--text-2)", lineHeight: 1.65,
                padding: "9px 13px", background: "#FFF7ED",
                borderRadius: 7, borderLeft: "3px solid var(--amber)",
              }}>
                ðŸ’¡ {q.explanation}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}
          onClick={() => { setAnswers({}); setSubmitted(false); }}>
          Retake Quiz
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={onEnquire}>
          Enquire Now â†’
        </button>
      </div>
    </div>
  );
}
