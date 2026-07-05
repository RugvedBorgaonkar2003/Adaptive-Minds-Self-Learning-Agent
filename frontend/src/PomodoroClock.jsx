import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PomodoroClock() {
  const [isTimerMode, setIsTimerMode] = useState(false);
  
  // Real clock state
  const [time, setTime] = useState(new Date());
  
  // Pomodoro timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus or break
  const [showHint, setShowHint] = useState(true);

  // Update real clock
  useEffect(() => {
    if (isTimerMode) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isTimerMode]);

  // Pomodoro countdown
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Auto-switch mode
      if (mode === 'focus') {
        setMode('break');
        setTimeLeft(5 * 60);
        setIsActive(false);
        // Play notification sound if possible
        try { new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3').play(); } catch(e){}
      } else {
        setMode('focus');
        setTimeLeft(25 * 60);
        setIsActive(false);
        try { new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3').play(); } catch(e){}
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = (e) => {
    e.stopPropagation();
    setIsActive(!isActive);
  };

  const resetTimer = (e) => {
    e.stopPropagation();
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleClockClick = () => {
    setShowHint(false);
    setIsTimerMode(!isTimerMode);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ position: 'relative' }}>
      
      {/* Hint Bubble */}
      <AnimatePresence>
        {showHint && !isTimerMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '180px',
              background: '#2C352E',
              color: '#F4F1EA',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-6px',
              right: '20px',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #2C352E'
            }}/>
            Click this clock to start a Pomodoro focus session.
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        onClick={handleClockClick}
        style={{
          background: 'rgba(252, 250, 246, 0.7)',
          border: '1px solid rgba(135,156,137,0.3)',
          borderRadius: '30px',
          padding: isTimerMode ? '0.6rem 1.2rem' : '0.6rem 1.2rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 10px rgba(44,53,46,0.05)',
          color: '#2C352E',
          fontFamily: "'Outfit', sans-serif"
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          {!isTimerMode ? (
            <motion.div
              key="real-time"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#879C89" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="pomodoro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#879C89', fontWeight: 600 }}>
                  {mode === 'focus' ? 'Focus Mode' : 'Break Time'}
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={toggleTimer}
                  style={{
                    background: isActive ? 'rgba(180,90,90,0.1)' : '#879C89',
                    color: isActive ? '#B45A5A' : '#FFF',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {isActive ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  )}
                </button>
                <button 
                  onClick={resetTimer}
                  style={{
                    background: 'transparent',
                    color: '#879C89',
                    border: '1px solid rgba(135,156,137,0.3)',
                    borderRadius: '50%',
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
