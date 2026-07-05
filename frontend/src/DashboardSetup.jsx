import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HarvestingStream from './HarvestingStream';
import CurriculumGeneration from './CurriculumGeneration';
import { useGlobalSound } from './SoundContext';
import './DashboardSetup.css';

export default function DashboardSetup() {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  const [goalDropdown, setGoalDropdown] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [sourceType, setSourceType] = useState('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const { startSound } = useGlobalSound();

  const handleSubmit = async (e) => {
    e.preventDefault();
    startSound();
    setIsSubmitting(true);
    try {
      const finalGoal = goalDropdown === 'other' ? customGoal : goalDropdown;
      const finalSourceType = level === 'advanced' ? sourceType : 'auto';
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('level', level);
      formData.append('reason', finalGoal);
      formData.append('source_method', finalSourceType);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/onboard`,
        {
          method: 'POST',
          headers: { 'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || '' },
          body: formData,
        }
      );
      const data = await response.json();
      if (data.status === 'success') {
        setJobId(data.job_id);
        setStep(2);
      } else {
        alert('Error starting onboarding: ' + data.message);
        setIsSubmitting(false);
      }
    } catch (error) {
      alert('Failed to connect to backend. Make sure FastAPI is running on port 8000.');
      console.error(error);
      setIsSubmitting(false);
    }
  };

  if (step === 2) {
    return (
      <motion.div
        style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 100 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <HarvestingStream
          topic={topic}
          jobId={jobId}
          onComplete={(curr) => { setCurriculum(curr); setStep(3); }}
        />
      </motion.div>
    );
  }

  if (step === 3) {
    return (
      <motion.div
        style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 100 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <CurriculumGeneration topic={topic} curriculum={curriculum} />
      </motion.div>
    );
  }

  const isFormValid =
    topic.trim() !== '' &&
    level !== '' &&
    goalDropdown !== '' &&
    (goalDropdown !== 'other' || customGoal.trim() !== '');

  return (
    <div className="setup-page-wrapper">

      {/* ── Layered Background ── */}
      {/* The Zen garden blooms in slowly — meditative and calm */}
      <motion.div
        className="setup-bg-image"
        initial={{ scale: 1.06, filter: 'blur(0px)' }}
        animate={{ scale: 1, filter: 'blur(8px)' }}
        transition={{ duration: 3.5, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* The warm ivory veil drifts in — like morning mist settling */}
      <motion.div
        className="setup-bg-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.8, ease: 'easeOut' }}
      />

      {/* Ambient glows */}
      <div className="setup-bg-glow-1" />
      <div className="setup-bg-glow-2" />

      {/* ── The Card flows up after the background settles ── */}
      <motion.div
        className="setup-card"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.8 }}
      >
        {/* Left Panel */}
        <div className="setup-left">
          <motion.h1
            className="setup-heading"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 1.2 }}
          >
            Construct<br />Your Journey.
          </motion.h1>
          <motion.p
            className="setup-subheading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 1.5 }}
          >
            Provide the parameters of your learning. The agent will traverse the web,
            synthesize the best material, and build a curriculum tailored to your exact goal.
          </motion.p>
        </div>

        {/* Right Panel — Form */}
        <motion.div
          className="setup-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.1 }}
        >
          <form className="setup-form" onSubmit={handleSubmit}>

            <div className="setup-form-group">
              <label>What do you want to learn?</label>
              <input
                type="text"
                className="setup-input"
                placeholder="e.g., Quantum Computing, Python, World History"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div className="setup-form-group">
              <label>At what depth should we begin?</label>
              <select
                className="setup-select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                required
              >
                <option value="" disabled>Select your experience level</option>
                <option value="beginner">Beginner — Exploring the foundations</option>
                <option value="intermediate">Intermediate — Deepening existing skills</option>
                <option value="advanced">Advanced — Complex insights &amp; mastery</option>
              </select>
            </div>

            <div className="setup-form-group">
              <label>Why do you want to learn this?</label>
              <select
                className="setup-select"
                value={goalDropdown}
                onChange={(e) => setGoalDropdown(e.target.value)}
                required
              >
                <option value="" disabled>Select a goal</option>
                <option value="Pass an exam">To pass an exam or certification</option>
                <option value="Build a project">To build a practical project</option>
                <option value="Personal growth">For personal growth and curiosity</option>
                <option value="other">Other (Specify)</option>
              </select>
            </div>

            <AnimatePresence>
              {goalDropdown === 'other' && (
                <motion.div
                  className="setup-form-group"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <input
                    type="text"
                    className="setup-input"
                    placeholder="Describe your specific goal…"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {level === 'advanced' && (
                <motion.div
                  className="setup-form-group"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <label>Information Source (Advanced Option)</label>
                  <div className="source-options">
                    <div
                      className={`source-card ${sourceType === 'auto' ? 'selected' : ''}`}
                      onClick={() => setSourceType('auto')}
                    >
                      <h4>Autonomous Harvest</h4>
                      <p>Agent curates the web</p>
                    </div>
                    <div
                      className={`source-card ${sourceType === 'manual' ? 'selected' : ''}`}
                      onClick={() => setSourceType('manual')}
                    >
                      <h4>Upload Sources</h4>
                      <p>Provide your own PDFs/Links</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {sourceType === 'manual' && (
                      <motion.div
                        className="upload-zone"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p style={{ color: 'var(--ob-text-secondary)', marginBottom: '0.8rem', fontSize: '0.9rem' }}>
                          Drag &amp; drop PDFs here (Coming Soon)
                        </p>
                        <input
                          type="text"
                          className="setup-input"
                          placeholder="Or paste a link here…"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              id="begin-journey-btn"
              className="setup-submit-btn"
              disabled={!isFormValid || isSubmitting}
              whileHover={isFormValid && !isSubmitting ? { y: -2 } : {}}
              whileTap={isFormValid && !isSubmitting ? { scale: 0.98 } : {}}
              transition={{ duration: 0.2 }}
            >
              {isSubmitting ? 'Initializing Agent…' : 'Begin Journey'}
            </motion.button>

          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
