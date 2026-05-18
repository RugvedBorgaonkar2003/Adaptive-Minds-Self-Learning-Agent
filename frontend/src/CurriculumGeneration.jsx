import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MOCK_CURRICULUM = [
  {
    id: 1,
    title: "Module 1: The Foundation",
    concepts: ["1.1 Core Principles", "1.2 Historical Context", "1.3 Fundamental Mechanics"]
  },
  {
    id: 2,
    title: "Module 2: Advanced Architecture",
    concepts: ["2.1 Structural Patterns", "2.2 Algorithmic Logic", "2.3 Error Correction"]
  },
  {
    id: 3,
    title: "Module 3: Practical Mastery",
    concepts: ["3.1 Real-world Applications", "3.2 Synthesis", "3.3 Final Project"]
  }
];

export default function CurriculumGeneration({ topic, curriculum }) {
  const navigate = useNavigate();
  const [visibleModuleIdx, setVisibleModuleIdx] = useState(-1);
  const [visibleConcepts, setVisibleConcepts] = useState({}); // { moduleIdx: numberOfConceptsVisible }
  const [isComplete, setIsComplete] = useState(false);

  // Prepare curriculum data mapping
  const modulesData = curriculum?.modules ? curriculum.modules.map((m, idx) => ({
    id: m.module_number || idx + 1,
    title: m.title,
    concepts: m.concepts.map(c => typeof c === 'string' ? c : c.title)
  })) : MOCK_CURRICULUM;

  useEffect(() => {
    let currentModule = 0;
    let currentConcept = 0;
    let currentVisibleModule = -1;

    const generateNext = () => {
      if (currentModule >= modulesData.length) {
        setTimeout(() => setIsComplete(true), 1500);
        return;
      }

      const moduleData = modulesData[currentModule];

      // If we are just starting this module
      if (currentVisibleModule < currentModule) {
        currentVisibleModule = currentModule;
        setVisibleModuleIdx(currentModule);
        setVisibleConcepts(prev => ({ ...prev, [currentModule]: 0 }));
        setTimeout(generateNext, 1200); 
      } 
      // If we are showing concepts for the current module
      else if (currentConcept < moduleData.concepts.length) {
        currentConcept++;
        setVisibleConcepts(prev => ({ ...prev, [currentModule]: currentConcept }));
        setTimeout(generateNext, 800); 
      } 
      // Module complete, move to next module
      else {
        currentModule++;
        currentConcept = 0;
        setTimeout(generateNext, 1500); 
      }
    };

    const initialDelay = setTimeout(generateNext, 2000);
    return () => clearTimeout(initialDelay);
  }, [modulesData.length]);

  return (
    <div className="curriculum-container">
      {/* Particles Background */}
      <div className="particles-overlay">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            initial={{ 
              y: '110vh', 
              x: `${Math.random() * 100}vw`,
              opacity: Math.random() * 0.4 + 0.1,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: '-10vh',
              x: `${Math.random() * 100}vw`
            }}
            transition={{ 
              duration: Math.random() * 20 + 15, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * -20 // Start at different times
            }}
          />
        ))}
      </div>

      <div className="curriculum-content">
        {/* Left Side: Header */}
        <div className="curriculum-header">
          <motion.h1 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            Synthesizing Your Path...
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          >
            Target Concept: <span>{topic || "The Unknown"}</span>
          </motion.p>

          <AnimatePresence>
            {isComplete && (
              <motion.button 
                className="begin-journey-btn"
                style={{ marginTop: '4rem', position: 'relative', bottom: 'auto', right: 'auto' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                onClick={() => {
                  if (curriculum) {
                    localStorage.setItem('curriculum', JSON.stringify(curriculum));
                  } else {
                    // Fallback mock
                    localStorage.setItem('curriculum', JSON.stringify({ modules: MOCK_CURRICULUM }));
                  }
                  navigate('/sanctuary');
                }}
              >
                Enter Sanctuary
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: The Tree */}
        <div className="curriculum-tree-wrapper">
          <div className="curriculum-tree">
            {modulesData.map((mod, mIdx) => (
              <div key={mod.id} className="tree-module-container">
                {/* Module Connecting Line */}
                <motion.div 
                  className="tree-spine"
                  initial={{ height: 0 }}
                  animate={{ height: visibleModuleIdx >= mIdx ? '100%' : 0 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                />

                {visibleModuleIdx >= mIdx && (
                  <motion.div 
                    className="module-card"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <div className="module-glow-point"></div>
                    <h2>{mod.title}</h2>
                    
                    <div className="concept-list">
                      {mod.concepts.map((concept, cIdx) => (
                        <div key={cIdx} className="concept-wrapper">
                          {/* Branch line */}
                          <motion.div 
                            className="concept-branch"
                            initial={{ width: 0 }}
                            animate={{ width: (visibleConcepts[mIdx] || 0) > cIdx ? '30px' : 0 }}
                            transition={{ duration: 0.5 }}
                          />
                          
                          <AnimatePresence>
                            {(visibleConcepts[mIdx] || 0) > cIdx && (
                              <motion.div 
                                className="concept-pill"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                              >
                                {concept}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
