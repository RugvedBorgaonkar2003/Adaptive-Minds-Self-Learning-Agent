import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PASS_THRESHOLD = 70;

// ── Single Question Card ────────────────────────────────────────────────────
function QuestionCard({ question, questionNumber, total, selectedIndex, onSelect, submitted, correctIndex }) {
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <motion.div
      className="mtest-question-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mtest-q-header">
        <span className="mtest-q-num">Question {questionNumber} of {total}</span>
        <div className="mtest-q-progress-dots">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`mtest-q-dot ${i < questionNumber - 1 ? 'done' : i === questionNumber - 1 ? 'current' : ''}`}
            />
          ))}
        </div>
      </div>

      <p className="mtest-question-text">{question.question}</p>

      <div className="mtest-options">
        {question.options.map((option, idx) => {
          let cls = 'mtest-option';
          if (submitted) {
            if (idx === correctIndex) cls += ' correct';
            else if (idx === selectedIndex && idx !== correctIndex) cls += ' wrong';
          } else if (idx === selectedIndex) {
            cls += ' selected';
          }

          return (
            <button
              key={idx}
              className={cls}
              onClick={() => !submitted && onSelect(idx)}
              disabled={submitted}
            >
              <span className="mtest-option-letter">{letters[idx]}</span>
              <span className="mtest-option-text">{option}</span>
              {submitted && idx === correctIndex && (
                <span className="mtest-option-icon correct-icon">✓</span>
              )}
              {submitted && idx === selectedIndex && idx !== correctIndex && (
                <span className="mtest-option-icon wrong-icon">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {submitted && question.explanation && (
        <motion.div
          className="mtest-explanation"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <span className="mtest-exp-label">💡 Explanation</span>
          <p>{question.explanation}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Score Result Screen ─────────────────────────────────────────────────────
function ResultScreen({ score, total, passed, onRetry, onContinue, isSubmitting }) {
  const pct = Math.round((score / total) * 100);
  const color = passed ? '#a3ad9e' : '#c47a6d';

  return (
    <motion.div
      className="mtest-result"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mtest-result-ring-wrap">
        <svg viewBox="0 0 36 36" className="mtest-result-ring">
          <path className="mtest-ring-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <motion.path
            className="mtest-ring-fill"
            stroke={color}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            initial={{ strokeDasharray: '0 100' }}
            animate={{ strokeDasharray: `${pct} 100` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <div className="mtest-result-pct" style={{ color }}>{pct}<span>%</span></div>
      </div>

      <div className="mtest-result-info">
        <div className={`mtest-result-badge ${passed ? 'pass' : 'fail'}`}>
          {passed ? '🎓 Module Passed' : '📚 Keep Studying'}
        </div>
        <h2 className="mtest-result-title">
          {passed ? 'Outstanding Work!' : 'Almost There!'}
        </h2>
        <p className="mtest-result-sub">
          You got <strong>{score} out of {total}</strong> questions correct ({pct}%)
          {passed
            ? ' — You\'ve mastered this module!'
            : `. You need ${PASS_THRESHOLD}% to pass. Review the concepts and try again.`}
        </p>

        <div className="mtest-result-actions">
          {passed ? (
            <button
              className="mtest-cta-btn primary"
              onClick={onContinue}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><span className="mtest-spinner" /> Generating your report...</>
              ) : (
                '🚀 Continue to Next Module →'
              )}
            </button>
          ) : (
            <>
              <p className="mtest-retry-note">
                ⚠ Score: {pct}% — Minimum required: {PASS_THRESHOLD}%
              </p>
              <button className="mtest-cta-btn secondary" onClick={onRetry}>
                🔄 Retry Test
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Loading Screen ──────────────────────────────────────────────────────────
function LoadingScreen({ message }) {
  return (
    <div className="mtest-loading">
      <motion.div
        className="mtest-loading-orb"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <p className="mtest-loading-text">{message}</p>
    </div>
  );
}

// ── Main ModuleTestView ─────────────────────────────────────────────────────
export default function ModuleTestView({ moduleTitle, concepts, moduleIndex, curriculum, onTestComplete }) {
  const [phase, setPhase] = useState('loading'); // loading | answering | result | submitting
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({}); // questionIndex → selectedOptionIndex
  const [submitted, setSubmitted] = useState(false); // current question revealed
  const [score, setScore] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    generateTest();
  }, [failedAttempts]); // re-generate on retry

  const generateTest = async () => {
    setPhase('loading');
    setCurrentQ(0);
    setAnswers({});
    setSubmitted(false);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/test/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || ''
        },
        body: JSON.stringify({ module_title: moduleTitle, concepts })
      });
      const data = await res.json();
      if (data.status === 'success' && data.test?.questions?.length) {
        setQuestions(data.test.questions);
        setPhase('answering');
      } else {
        throw new Error('No questions returned');
      }
    } catch (e) {
      console.error('Test generation failed:', e);
      setPhase('error');
    }
  };

  const handleSelect = (optionIdx) => {
    setAnswers(prev => ({ ...prev, [currentQ]: optionIdx }));
  };

  const handleSubmitAnswer = () => {
    setSubmitted(true);
  };

  const handleNextQuestion = () => {
    setSubmitted(false);
    setCurrentQ(prev => prev + 1);
  };

  const handleFinishTest = () => {
    // Calculate score
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct_answer_index) correct++;
    });
    const pct = Math.round((correct / questions.length) * 100);
    const didPass = pct >= PASS_THRESHOLD;
    setScore(correct);
    setPassed(didPass);
    setPhase('result');
  };

  const handleRetry = () => {
    setFailedAttempts(prev => prev + 1);
  };

  const handleContinue = async () => {
    setPhase('submitting');
    try {
      const pct = Math.round((score / questions.length) * 100);
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/module/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || ''
        },
        body: JSON.stringify({
          session_id: localStorage.getItem('session_id'),
          curriculum,
          current_module_index: moduleIndex,
          score: pct,
          failed_attempts: failedAttempts
        })
      });
      // Notify parent to advance to next module
      if (onTestComplete) onTestComplete(moduleIndex + 1, pct);
    } catch (e) {
      console.error('Module complete failed:', e);
      if (onTestComplete) onTestComplete(moduleIndex + 1, Math.round((score / questions.length) * 100));
    }
  };

  const q = questions[currentQ];
  const totalQ = questions.length;
  const isLastQuestion = currentQ === totalQ - 1;
  const hasSelected = answers[currentQ] !== undefined;
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <div className="mtest-wrapper">
      {/* Header */}
      <div className="mtest-header">
        <div className="mtest-header-left">
          <div className="mtest-header-eyebrow">End-of-Module Assessment</div>
          <h1 className="mtest-header-title">{moduleTitle}</h1>
        </div>
        <div className="mtest-header-badge">
          <span className="mtest-pass-badge">Pass: {PASS_THRESHOLD}%+</span>
        </div>
      </div>

      <div className="mtest-body">
        <AnimatePresence mode="wait">

          {phase === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingScreen message="Generating your end-of-module test..." />
            </motion.div>
          )}

          {phase === 'submitting' && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingScreen message="Generating your mastery report & notes..." />
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div key="error" className="mtest-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p>⚠ Failed to load test. Please try again.</p>
              <button className="mtest-cta-btn secondary" onClick={generateTest}>Retry</button>
            </motion.div>
          )}

          {phase === 'answering' && q && (
            <motion.div key={`q-${currentQ}-${failedAttempts}`} className="mtest-question-wrap"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <QuestionCard
                question={q}
                questionNumber={currentQ + 1}
                total={totalQ}
                selectedIndex={answers[currentQ]}
                onSelect={handleSelect}
                submitted={submitted}
                correctIndex={q.correct_answer_index}
              />

              <div className="mtest-nav">
                {!submitted ? (
                  <button
                    className="mtest-cta-btn primary"
                    onClick={handleSubmitAnswer}
                    disabled={!hasSelected}
                  >
                    Submit Answer
                  </button>
                ) : isLastQuestion ? (
                  <button className="mtest-cta-btn primary" onClick={handleFinishTest}>
                    View Results →
                  </button>
                ) : (
                  <button className="mtest-cta-btn primary" onClick={handleNextQuestion}>
                    Next Question →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultScreen
                score={score}
                total={totalQ}
                passed={passed}
                onRetry={handleRetry}
                onContinue={handleContinue}
                isSubmitting={false}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
