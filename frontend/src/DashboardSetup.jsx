import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HarvestingStream from './HarvestingStream';
import CurriculumGeneration from './CurriculumGeneration';

export default function DashboardSetup() {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [sourceType, setSourceType] = useState(null); // 'auto' or 'manual'
  const [jobId, setJobId] = useState(null);
  const [curriculum, setCurriculum] = useState(null);

  const handleTopicSubmit = (e) => {
    if (e.key === 'Enter' && topic.trim() !== '') {
      setStep(2);
    }
  };

  const handleLevelSelect = (selectedLevel) => {
    setLevel(selectedLevel);
    setTimeout(() => setStep(3), 500);
  };

  const handleGoalSubmit = (e) => {
    if (e.key === 'Enter' && goal.trim() !== '') {
      setStep(4);
    }
  };

  const handleChipSelect = (selectedGoal) => {
    setGoal(selectedGoal);
    setTimeout(() => setStep(4), 500);
  };

  const handleSourceSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('level', level);
      formData.append('reason', goal);
      formData.append('source_method', sourceType || 'auto');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/onboard`, {
        method: 'POST',
        headers: {
          'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || ''
        },
        body: formData
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setJobId(data.job_id);
        setStep(5);
      } else {
        alert("Error starting onboarding: " + data.message);
      }
    } catch (error) {
      alert("Failed to connect to backend. Make sure FastAPI is running on port 8000.");
      console.error(error);
    }
  };

  const getProgress = () => {
    if (step === 1) return '20%';
    if (step === 2) return '40%';
    if (step === 3) return '60%';
    if (step === 4) return '80%';
    return '100%';
  };

  return (
    <div className="setup-container">
      {/* Background glowing orb */}
      <motion.div 
        className="ambient-orb"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 20, -20, 0],
          y: [0, -20, 20, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      {/* Progress Bar */}
      <div className="setup-progress-bar">
        <motion.div 
          className="setup-progress-fill" 
          animate={{ width: getProgress() }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      <div className="setup-content">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              className="step-wrapper"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="step-label">Step 1: The Spark</h2>
              <h1 className="step-question">What do you want to master today?</h1>
              
              <div className="giant-input-wrapper">
                <input 
                  type="text" 
                  className="giant-topic-input"
                  placeholder="e.g. Quantum Computing, Python, World History..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={handleTopicSubmit}
                  autoFocus
                />
                <motion.div 
                  className="input-glow"
                  animate={{ opacity: topic ? 1 : 0 }}
                />
              </div>
              
              <motion.p 
                className="press-enter-hint"
                animate={{ opacity: topic.trim() ? 1 : 0 }}
              >
                Press <strong>Enter</strong> to continue
              </motion.p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              className="step-wrapper"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="step-label">Step 2: The Foundation</h2>
              <h1 className="step-question">At what depth should we begin?</h1>
              
              <div className="cards-grid">
                <motion.div 
                  className={`level-card ${level === 'novice' ? 'selected' : ''}`}
                  onClick={() => handleLevelSelect('novice')}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="card-icon">🌱</div>
                  <h3>Seed</h3>
                  <p>I am exploring the foundations</p>
                </motion.div>

                <motion.div 
                  className={`level-card ${level === 'practitioner' ? 'selected' : ''}`}
                  onClick={() => handleLevelSelect('practitioner')}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="card-icon">🌿</div>
                  <h3>Root</h3>
                  <p>I want to deepen my existing skills</p>
                </motion.div>

                <motion.div 
                  className={`level-card ${level === 'master' ? 'selected' : ''}`}
                  onClick={() => handleLevelSelect('master')}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="card-icon">🌳</div>
                  <h3>Canopy</h3>
                  <p>I need advanced, complex insights</p>
                </motion.div>
              </div>
            </motion.div>
          )}
          
          {step === 3 && (
            <motion.div 
              key="step3"
              className="step-wrapper"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="step-label">Step 3: The Intent</h2>
              <h1 className="step-question">What is your ultimate goal?</h1>
              
              <div className="giant-input-wrapper">
                <input 
                  type="text" 
                  className="giant-topic-input"
                  placeholder="e.g. I want to build a web app..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={handleGoalSubmit}
                  autoFocus
                />
                <motion.div 
                  className="input-glow"
                  animate={{ opacity: goal ? 1 : 0 }}
                />
              </div>

              <div className="suggestion-chips">
                <motion.button 
                  className="chip"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChipSelect('Pass an Exam')}
                >
                  🎯 Pass an Exam
                </motion.button>
                <motion.button 
                  className="chip"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChipSelect('Build a Project')}
                >
                  🛠️ Build a Project
                </motion.button>
                <motion.button 
                  className="chip"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChipSelect('Personal Growth')}
                >
                  🌱 Personal Growth
                </motion.button>
              </div>
              
              <motion.p 
                className="press-enter-hint"
                animate={{ opacity: goal.trim() ? 1 : 0 }}
              >
                Press <strong>Enter</strong> to continue
              </motion.p>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              className="step-wrapper"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
               <h2 className="step-label">Step 4: The Harvest</h2>
               <h1 className="step-question">How should we gather the knowledge?</h1>

               {!sourceType && (
                 <div className="cards-grid">
                   <motion.div 
                     className="source-card level-card"
                     onClick={() => setSourceType('auto')}
                     whileHover={{ y: -5 }}
                     whileTap={{ scale: 0.98 }}
                   >
                     <div className="card-icon">✨</div>
                     <h3>Autonomous Harvest</h3>
                     <p>Let the AI agent scour the web and curate the best sources automatically.</p>
                   </motion.div>

                   <motion.div 
                     className="source-card level-card"
                     onClick={() => setSourceType('manual')}
                     whileHover={{ y: -5 }}
                     whileTap={{ scale: 0.98 }}
                   >
                     <div className="card-icon">📁</div>
                     <h3>Provide Sources</h3>
                     <p>Upload your own PDFs, documents, or provide specific web links.</p>
                   </motion.div>
                 </div>
               )}

               {sourceType === 'manual' && (
                 <motion.div 
                   className="manual-source-zone"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                 >
                   <div className="drag-drop-zone">
                     <span className="zone-icon">📥</span>
                     <p>Drag & drop PDFs here or click to browse</p>
                   </div>
                   <p className="or-divider">OR</p>
                   <div className="giant-input-wrapper">
                     <input 
                       type="text" 
                       className="giant-topic-input"
                       placeholder="Paste a web link here..."
                       onKeyDown={(e) => {
                         if(e.key === 'Enter') handleSourceSubmit();
                       }}
                     />
                   </div>
                   <motion.button 
                     className="begin-journey-btn construct-btn"
                     style={{ position: 'relative', marginTop: '3rem', bottom: 'auto', right: 'auto' }}
                     onClick={handleSourceSubmit}
                   >
                     Construct Curriculum
                   </motion.button>
                 </motion.div>
               )}

               {sourceType === 'auto' && (
                 <motion.div 
                   className="auto-harvest-zone"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                 >
                   <p className="ambient-text" style={{ fontSize: '1.2rem', color: 'var(--color-sage)', marginBottom: '2rem' }}>
                     The Adaptive Agent is ready to begin searching the web for exactly what you need.
                   </p>
                   <motion.button 
                     className="begin-journey-btn construct-btn"
                     style={{ position: 'relative', bottom: 'auto', right: 'auto' }}
                     onClick={handleSourceSubmit}
                   >
                     Initialize Agent
                   </motion.button>
                 </motion.div>
               )}
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step5"
              style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 100 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <HarvestingStream 
                topic={topic} 
                jobId={jobId}
                onComplete={(curr) => {
                  setCurriculum(curr);
                  setStep(6);
                }} 
              />
            </motion.div>
          )}

          {step === 6 && (
            <motion.div 
              key="step6"
              style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 100 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
            >
              <CurriculumGeneration topic={topic} curriculum={curriculum} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
