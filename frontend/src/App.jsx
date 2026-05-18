import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import Login from './Login';
import DashboardSetup from './DashboardSetup';
import SanctuaryDashboard from './SanctuaryDashboard';
import ApiSetup from './ApiSetup';

const features = [
  {
    id: "01",
    title: "Seamless Ingestion",
    description: "Feed the mind without the friction. Upload PDFs, links, or videos; Adaptive Minds instantly harvests and organizes the core knowledge for you.",
    image: "/ingestion.png",
    align: "left"
  },
  {
    id: "02",
    title: "Living Curriculums",
    description: "No more scattered learning. Our AI architect constructs a structured, book-like roadmap tailored specifically to your chosen topic and pace.",
    image: "/living_curriculum.png",
    align: "right"
  },
  {
    id: "03",
    title: "Guided Immersion",
    description: "Journey through knowledge, concept by concept. We guide you through modules with a focused flow that ensures mastery before moving forward.",
    image: "/guided_immersion.png",
    align: "left"
  },
  {
    id: "04",
    title: "Instant Recall",
    description: "Transform moments of focus into lasting memory. Automatically generate minimalist flashcards for the specific concept you are currently exploring.",
    image: "/flashcard.png",
    align: "right"
  },
  {
    id: "05",
    title: "Reflective Growth",
    description: "Close the loop with automated mastery tests, comprehensive synthesized notes, and a personalized report on your progress.",
    image: "/reflective_growth.png",
    align: "left"
  }
];

function DiscoveryPath() {
  return (
    <section className="discovery-path">
      <svg className="vine-connector" preserveAspectRatio="none" viewBox="0 0 100 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 0 C 80 200, 20 400, 50 600 C 80 800, 20 1000, 50 1000" stroke="rgba(163, 173, 158, 0.15)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {features.map((feature) => {
        const isLeft = feature.align === 'left';

        return (
          <div className={`feature-row ${isLeft ? 'row-left' : 'row-right'}`} key={feature.id}>
            <motion.div
              className="feature-image-container"
              initial={{ opacity: 0, x: isLeft ? -100 : 100, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="squircle-mask">
                <img src={feature.image} alt={feature.title} className="feature-image" />
              </div>
            </motion.div>

            <motion.div
              className="feature-text-container"
              initial={{ opacity: 0, x: isLeft ? 100 : -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            >
              <span className="feature-number">{feature.id}</span>
              <h2 className="feature-title">{feature.title}</h2>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          </div>
        );
      })}
    </section>
  );
}

function Home() {
  const { scrollY } = useScroll();
  const backgroundOpacity = useTransform(scrollY, [0, 800], [1, 0]);

  return (
    <div className="app-wrapper">
      <div className="hero-container">
        {/* Background Layer (The Soul) */}
        <motion.div 
          className="background-layer"
          style={{ opacity: backgroundOpacity }}
        >
          <img
            src="https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop"
            alt="Misty deep-pine forest at dawn"
            className="background-image"
          />
          <div className="background-overlay"></div>
        </motion.div>

        {/* Top Navigation (The Floating Header) */}
        <nav className="header-nav">
          <motion.a
            href="/"
            className="logo"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Adaptive Minds
          </motion.a>

          <ul className="nav-links">
            <motion.li
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            >
              <RouterLink to="/login" className="nav-link">Log In</RouterLink>
            </motion.li>
            <motion.li
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              <RouterLink to="/signup" className="nav-btn">Sign Up</RouterLink>
            </motion.li>
          </ul>
        </nav>

        {/* The Central Content (The Focus) */}
        <main className="main-content">
          <motion.h1
            className="headline"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
          >
            Focus, Naturally.
          </motion.h1>

          <motion.p
            className="sub-headline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.8 }}
          >
            An intelligent sanctuary for deep learning. We transform chaotic information into structured, biophilic environments designed to maximize focus and accelerate mastery.
          </motion.p>
        </main>
      </div>

      <DiscoveryPath />
    </div>
  );
}

function App() {
  const [hasKey, setHasKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const key = localStorage.getItem('groqApiKey');
    if (key) {
      setHasKey(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) return null;

  if (!hasKey) {
    return <ApiSetup onComplete={() => setHasKey(true)} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />
        <Route path="/dashboard" element={<DashboardSetup />} />
        <Route path="/sanctuary" element={<SanctuaryDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
