import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import './Hero.css';

const IngestionGraphic = () => (
  <div className="graphic-ui graphic-ingest">
    <motion.div className="ingest-box" initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>PDF / Video</motion.div>
    <motion.div className="ingest-arrow" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.6 }}>↓</motion.div>
    <motion.div className="ingest-box ingest-brain" initial={{ y: -20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>Structured Knowledge</motion.div>
  </div>
);

const CurriculumGraphic = () => (
  <div className="graphic-ui graphic-curriculum">
    <div className="timeline">
      <motion.div className="timeline-node active" initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>1. The Fundamentals</motion.div>
      <motion.div className="timeline-node active" initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>2. Applied Concepts</motion.div>
      <motion.div className="timeline-node" initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>3. Deep Mastery</motion.div>
    </div>
  </div>
);

const PersonalizationGraphic = () => (
  <div className="graphic-ui graphic-chat">
    <motion.div className="chat-bubble user-bubble" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
      I don't understand backpropagation.
    </motion.div>
    <motion.div className="chat-bubble ai-bubble" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
      Let's break it down using the water pipe analogy we discussed yesterday...
    </motion.div>
  </div>
);

const FocusGraphic = () => (
  <div className="graphic-ui graphic-focus">
    <div className="focus-window">
      <div className="focus-header">
        <span className="dot"></span><span className="dot"></span><span className="dot"></span>
      </div>
      <div className="focus-body">
        <div className="focus-line w-80"></div>
        <div className="focus-line w-60"></div>
        <div className="focus-line w-90"></div>
        <div className="focus-timer">25:00</div>
      </div>
    </div>
  </div>
);

const ReflectionGraphic = () => (
  <div className="graphic-ui graphic-reflect">
    <div className="report-mock">
      <div className="report-title">Mastery Report</div>
      <div className="report-bar"><div className="report-fill w-70"></div></div>
      <div className="report-bar"><div className="report-fill w-90"></div></div>
      <div className="report-bar"><div className="report-fill w-40"></div></div>
    </div>
  </div>
);

const RecallGraphic = () => (
  <div className="graphic-ui graphic-recall">
    <motion.div className="flashcard-mock" initial={{ rotateY: 180 }} whileInView={{ rotateY: 0 }} transition={{ duration: 1, delay: 0.2 }}>
      <div className="flashcard-content">
        <span className="flashcard-tag">Concept</span>
        <div className="flashcard-text">Gradient Descent</div>
      </div>
    </motion.div>
  </div>
);


const StorySection = ({ title, description, align, delay = 0, graphic }) => {
  const isLeft = align === 'left';
  return (
    <motion.div 
      className={`story-section ${isLeft ? 'story-left' : 'story-right'}`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <div className="story-content">
        <h2 className="story-title">{title}</h2>
        <p className="story-description">{description}</p>
      </div>
      <div className="story-graphic-container">
        {graphic}
      </div>
    </motion.div>
  );
};

export default function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const yPos = useTransform(scrollY, [0, 400], [0, -50]);
  const bgY = useTransform(scrollY, [0, 1000], [0, 200]);

  return (
    <div className="hero-wrapper">
      {/* Background Layer */}
      <motion.div className="hero-bg" style={{ y: bgY }}>
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
        <div className="hero-glow-3"></div>
      </motion.div>

      {/* Top Navigation */}
      <nav className="hero-nav">
        <motion.div 
          className="hero-logo"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Adaptive Minds
        </motion.div>
        <div className="hero-nav-actions">
          <RouterLink to="/login" className="hero-btn-login">Log In</RouterLink>
          <RouterLink to="/signup" className="hero-btn-signup">Sign Up</RouterLink>
        </div>
      </nav>

      {/* Main Hook */}
      <div className="hero-header-container">
        <div className="hero-header-image-overlay"></div>
        <motion.header 
          className="hero-header"
          style={{ opacity, y: yPos }}
        >
          <motion.h1 
            className="hero-headline"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          >
            A tutor that adapts to your mind.
          </motion.h1>
          <motion.p 
            className="hero-subheadline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          >
            Quiet, focused, and built for deep learning. Escape the noise and enter a beautifully curated sanctuary where you actually master what you learn.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="hero-scroll-indicator"
          >
            <span>Scroll to explore</span>
            <div className="scroll-line"></div>
          </motion.div>
        </motion.header>
      </div>

      {/* Scroll Storytelling */}
      <main className="hero-story">
        <StorySection 
          align="left"
          title="Seamless Ingestion."
          description="Feed the mind without the friction. Upload PDFs, links, or videos; Adaptive Minds instantly harvests and organizes the core knowledge for you."
          graphic={<IngestionGraphic />}
        />

        <StorySection 
          align="right"
          title="Living Curriculums."
          description="No more scattered learning. Our AI architect constructs a structured, book-like roadmap tailored specifically to your chosen topic and pace."
          graphic={<CurriculumGraphic />}
        />

        <StorySection 
          align="left"
          title="True Personalization."
          description="It doesn't just give answers. The AI analyzes your learning style, question depth, and emotional state in real-time, instantly adjusting its explanations so they perfectly click for you."
          graphic={<PersonalizationGraphic />}
        />
        
        <StorySection 
          align="right"
          title="Eliminate Digital Distractions."
          description="No tabs. No pop-ups. Just you and the knowledge. The interface actively enforces a minimalist fullscreen focus mode so you can achieve deep, uninterrupted flow."
          graphic={<FocusGraphic />}
        />

        <StorySection 
          align="left"
          title="Intelligent Reflection."
          description="Transform passive reading into active mastery. After every session, receive a granular performance report and automatically synthesized notes highlighting your exact knowledge gaps."
          graphic={<ReflectionGraphic />}
        />

        <StorySection 
          align="right"
          title="Instant Recall."
          description="Turn moments of focus into lasting memory. The system automatically generates minimalist flashcards for the specific concepts you struggled with, perfectly timed for spaced repetition."
          graphic={<RecallGraphic />}
        />
      </main>

      {/* Final CTA */}
      <motion.section 
        className="hero-footer-cta"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 1.5 }}
      >
        <h2>Ready to focus?</h2>
        <RouterLink to="/signup" className="hero-btn-signup-large">Start Learning</RouterLink>
      </motion.section>
    </div>
  );
}
