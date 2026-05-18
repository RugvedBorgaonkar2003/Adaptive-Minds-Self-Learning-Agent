import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApiSetup({ onComplete }) {
  const [key, setKey] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && key.trim() !== '') {
      // Save key to local storage
      localStorage.setItem('groqApiKey', key.trim());
      setIsSuccess(true);
      // Wait for success animation before transitioning
      setTimeout(() => {
        onComplete();
      }, 1800);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="hero-container">
        {/* Background Layer matching Home page */}
        <motion.div className="background-layer">
          <img
            src="https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop"
            alt="Misty deep-pine forest at dawn"
            className="background-image"
          />
          <div className="background-overlay"></div>
        </motion.div>

        {/* Floating Header */}
        <nav className="header-nav">
          <motion.div
            className="logo"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Adaptive Minds
          </motion.div>
        </nav>

        {/* Central Content */}
        <main className="main-content" style={{ zIndex: 10, width: '100%' }}>
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="step-wrapper"
              >
                <h1 className="headline" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
                  Bring Your Own Key
                </h1>
                <p className="sub-headline" style={{ marginBottom: '3.5rem' }}>
                  To ensure uninterrupted deep learning, Adaptive Minds requires a personal Groq API key to power your agent.
                </p>

                <div className="giant-input-wrapper" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                  <input
                    type="password"
                    className="giant-topic-input"
                    placeholder="Add your Groq key here (gsk_...)"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    onKeyDown={handleSubmit}
                    autoFocus
                    style={{ fontSize: '1.5rem', padding: '1.5rem 2rem' }}
                  />
                  <motion.div
                    className="input-glow"
                    animate={{ opacity: key ? 1 : 0 }}
                  />
                </div>

                <p className="ambient-text" style={{ marginTop: '2rem', color: 'var(--color-sage)', fontSize: '0.95rem' }}>
                  Don't have one? Get your free key at{' '}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-off-white)', textDecoration: 'underline', transition: 'color 0.3s ease' }}
                  >
                    console.groq.com/keys
                  </a>
                </p>

                <motion.button
                  className="cta-button"
                  style={{ marginTop: '2.5rem' }}
                  onClick={handleSubmit}
                  animate={{ opacity: key.trim() ? 1 : 0.5, pointerEvents: key.trim() ? 'auto' : 'none' }}
                >
                  Authenticate
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: 'rgba(74, 93, 78, 0.4)',
                    border: '2px solid var(--color-moss)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '2rem',
                    boxShadow: '0 0 40px rgba(74, 93, 78, 0.4)'
                  }}
                >
                  <motion.svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-off-white)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </motion.svg>
                </div>
                <h2 className="feature-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                  Connection Secured
                </h2>
                <p className="feature-description">
                  Your sanctuary is ready.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
