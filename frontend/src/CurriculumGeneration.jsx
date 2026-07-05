import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGlobalSound } from './SoundContext';
import './CurriculumGeneration.css';

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

const AI_THOUGHTS = [
  "Raking the sand of knowledge...",
  "Placing the foundational stones...",
  "Synthesizing core concepts...",
  "Weaving advanced architecture...",
  "Polishing the final curriculum...",
  "Your path is nearly complete..."
];

export default function CurriculumGeneration({ topic, curriculum }) {
  const navigate = useNavigate();
  const { soundOn, toggleSound } = useGlobalSound();
  
  const [visibleModuleIdx, setVisibleModuleIdx] = useState(-1);
  const [visibleConcepts, setVisibleConcepts] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [thoughtIdx, setThoughtIdx] = useState(0);
  
  const containerRef = useRef(null);

  const modulesData = curriculum?.modules ? curriculum.modules.map((m, idx) => ({
    id: m.module_number || idx + 1,
    title: m.title,
    concepts: m.concepts.map(c => typeof c === 'string' ? c : c.title)
  })) : MOCK_CURRICULUM;

  const ROW_HEIGHT = 300; // Matches CSS fixed height
  const totalPathHeight = modulesData.length * ROW_HEIGHT + 150;

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

      if (currentVisibleModule < currentModule) {
        currentVisibleModule = currentModule;
        setVisibleModuleIdx(currentModule);
        setVisibleConcepts(prev => ({ ...prev, [currentModule]: 0 }));
        
        // Auto-scroll logic to follow the path
        if (containerRef.current) {
           const scrollTarget = currentModule * ROW_HEIGHT;
           containerRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
        
        setTimeout(generateNext, 1200); 
      } 
      else if (currentConcept < moduleData.concepts.length) {
        currentConcept++;
        setVisibleConcepts(prev => ({ ...prev, [currentModule]: currentConcept }));
        setTimeout(generateNext, 800); 
      } 
      else {
        currentModule++;
        currentConcept = 0;
        setThoughtIdx(prev => Math.min(prev + 1, AI_THOUGHTS.length - 1));
        setTimeout(generateNext, 1500); 
      }
    };

    const initialDelay = setTimeout(generateNext, 2000);
    return () => clearTimeout(initialDelay);
  }, [modulesData.length]);

  // Generate a soft, weaving SVG path that physically touches each module box
  const generatePathD = () => {
    let d = `M 450 0`; // Start at top center of 900px wide SVG
    for(let i = 0; i < modulesData.length; i++) {
       const y = i * ROW_HEIGHT + (ROW_HEIGHT / 2);
       // Even index boxes are on the left (x=0 to 400). Odd index boxes are on the right (x=500 to 900).
       const isLeft = i % 2 === 0;
       
       // Center is 450. Left box inner edge is 400. Right box inner edge is 500.
       const targetX = isLeft ? 400 : 500; 
       
       // Draw elegant curve from center down to the exact edge of the box
       d += ` C 450 ${y - ROW_HEIGHT * 0.3}, ${targetX} ${y - ROW_HEIGHT * 0.2}, ${targetX} ${y}`;
       
       // Draw curve from the box edge back to the center for the next row
       d += ` C ${targetX} ${y + ROW_HEIGHT * 0.2}, 450 ${y + ROW_HEIGHT * 0.3}, 450 ${y + ROW_HEIGHT * 0.5}`;
    }
    
    // Draw a final straight line directly to the top edge of the Enter Sanctuary button
    // The button has a margin-top of 4rem (64px) below the last row.
    const finalY = modulesData.length * ROW_HEIGHT + 64;
    d += ` L 450 ${finalY}`;
    
    return d;
  };

  // Calculate how far the SVG line should be drawn.
  // Each module represents 1 full segment (center -> box -> center).
  // The box itself is exactly halfway through the segment (0.5).
  // When a module is revealed, we want the line to pause exactly AT the box.
  const pathProgress = isComplete 
      ? 1 
      : Math.max(0, (visibleModuleIdx + 0.5) / modulesData.length);

  return (
    <div className="zen-curriculum-wrapper">
      <div className="zen-sand-bg" />
      <div className="zen-overlay" />

      {/* Top Controls */}
      <motion.div 
        className="zen-topbar"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <span style={{ fontWeight:600, fontSize:'0.9rem', letterSpacing:'0.13em', textTransform:'uppercase', color:'#2C352E', opacity:0.55 }}>
          Adaptive Minds • {topic || "Curriculum"}
        </span>
        
        <motion.button
          onClick={toggleSound}
          whileHover={{ scale: 1.04 }} 
          whileTap={{ scale: 0.96 }}
          style={{
            padding:'0.52rem 1.1rem', borderRadius:'30px',
            border:'1px solid rgba(44,53,46,0.16)',
            background: soundOn ? 'rgba(135,156,137,0.25)' : 'rgba(255,255,255,0.55)',
            color:'#2C352E', fontSize:'0.82rem', fontWeight:500,
            cursor:'pointer', backdropFilter:'blur(10px)',
            fontFamily:"'Outfit', sans-serif",
            display:'flex', alignItems:'center', gap:'0.45rem',
          }}
        >
          <span>{soundOn ? '🔊' : '🔇'}</span>
          {soundOn ? 'Garden Sounds' : 'Muted'}
        </motion.button>
      </motion.div>

      {/* Main Content Area */}
      <div className="zen-scroll-container" ref={containerRef}>
        
        {/* SVG Drawing Path */}
        <svg className="zen-path-svg" viewBox={`0 0 900 ${totalPathHeight}`} style={{ height: totalPathHeight }}>
           {/* Faint background groove */}
           <path 
             d={generatePathD()} 
             fill="none" 
             stroke="rgba(135,156,137,0.15)" 
             strokeWidth="4" 
             strokeLinecap="round" 
           />
           {/* Animated solid path */}
           <motion.path
             d={generatePathD()}
             fill="none"
             stroke="#879C89"
             strokeWidth="4"
             strokeLinecap="round"
             initial={{ pathLength: 0 }}
             animate={{ pathLength: pathProgress }}
             transition={{ duration: 1.5, ease: "easeInOut" }}
           />
        </svg>

        {/* AI Thought Bubble tracking the pen (approximate y position) */}
        <AnimatePresence>
          {!isComplete && (
            <motion.div
              className="ai-thought-bubble"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, top: (visibleModuleIdx >= 0 ? visibleModuleIdx : 0) * ROW_HEIGHT + ROW_HEIGHT/2 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
            >
              {AI_THOUGHTS[thoughtIdx]}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="zen-stones-container">
          {modulesData.map((mod, mIdx) => (
            <div key={mod.id} className="zen-stone-wrapper">
              <AnimatePresence>
                {visibleModuleIdx >= mIdx && (
                  <motion.div 
                    className={`zen-stone ${visibleModuleIdx === mIdx && !isComplete ? 'glowing' : ''}`}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h2 className="zen-stone-title">{mod.title}</h2>
                    
                    <div className="zen-concept-list">
                      {mod.concepts.map((concept, cIdx) => (
                        <AnimatePresence key={cIdx}>
                          {(visibleConcepts[mIdx] || 0) > cIdx && (
                            <motion.div 
                              className="zen-concept-item"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            >
                              <span className="zen-concept-bullet">✦</span>
                              <span>{concept}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Final Enter Button */}
          <AnimatePresence>
            {isComplete && (
              <motion.button 
                className="zen-enter-btn"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                onClick={() => {
                  if (curriculum) {
                    localStorage.setItem('curriculum', JSON.stringify(curriculum));
                  } else {
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

      </div>
    </div>
  );
}
