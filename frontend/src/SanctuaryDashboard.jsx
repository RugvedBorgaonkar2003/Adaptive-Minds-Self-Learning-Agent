import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FlashcardsView from './FlashcardsView';
import NotesView from './NotesView';
import ReportsView from './ReportsView';
import ModuleTestView from './ModuleTestView';
import PomodoroClock from './PomodoroClock';
import { useGlobalSound } from './SoundContext';
import ReactMarkdown from 'react-markdown';

export default function SanctuaryDashboard() {
  const [activeTab, setActiveTab] = useState('learning'); // learning, reports, notes, flashcards
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const [curriculum, setCurriculum] = useState(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentConceptIndex, setCurrentConceptIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Flashcard state: all generated decks stored here, passed into FlashcardsView
  const [flashDecks, setFlashDecks] = useState([]);
  const [isGeneratingFlash, setIsGeneratingFlash] = useState(false);

  // Test mode: true when backend signals all concepts done & test should begin
  const [isTestingMode, setIsTestingMode] = useState(false);

  // Zen Light additions
  const { soundOn, toggleSound } = useGlobalSound();
  const [isFocusMode, setIsFocusMode] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFocusMode(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFocus = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen?.();
      // State is updated via event listener
    } else {
      document.exitFullscreen?.();
      // State is updated via event listener
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('curriculum');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurriculum(parsed);
        
        let sid = localStorage.getItem('session_id');
        if (!sid) {
          sid = "session_" + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('session_id', sid);
        }
        
        initChat(sid, parsed, 0, 0);
      } catch (e) {
        console.error("Failed to load curriculum:", e);
      }
    } else {
      setMessages([{ role: 'agent', content: 'No curriculum found. Please go back to the dashboard to generate one.' }]);
    }
  }, []);

  const initChat = async (session_id, curr, modIdx, conIdx) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || ''
        },
        body: JSON.stringify({
          session_id,
          user_input: '',
          curriculum: curr,
          current_module_index: modIdx,
          current_concept_index: conIdx
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessages([{ role: 'agent', content: data.ai_response }]);
        setCurrentModuleIndex(data.current_module_index);
        setCurrentConceptIndex(data.current_concept_index);
        if (data.is_testing_mode) setIsTestingMode(true);
      }
    } catch (e) {
       console.error(e);
       setMessages([{ role: 'agent', content: 'Error connecting to backend...' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const newMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsProcessing(true);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || ''
        },
        body: JSON.stringify({
          session_id: localStorage.getItem('session_id'),
          user_input: newMsg.content,
          curriculum,
          current_module_index: currentModuleIndex,
          current_concept_index: currentConceptIndex
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessages(prev => [...prev, { role: 'agent', content: data.ai_response }]);
        setCurrentModuleIndex(data.current_module_index);
        setCurrentConceptIndex(data.current_concept_index);
        if (data.is_testing_mode) setIsTestingMode(true);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'agent', content: "Failed to connect to agent." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Called ONLY when user explicitly clicks "Next Concept →"
  const handleNextConcept = async () => {
    if (isProcessing || !curriculum) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/concept/advance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || ''
        },
        body: JSON.stringify({
          session_id: localStorage.getItem('session_id'),
          curriculum,
          current_module_index: currentModuleIndex,
          current_concept_index: currentConceptIndex
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCurrentModuleIndex(data.current_module_index);
        setCurrentConceptIndex(data.current_concept_index);
        if (data.is_testing_mode) {
          // All concepts done — trigger test
          setIsTestingMode(true);
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'system', content: '── Moving to next concept ──' },
            { role: 'agent', content: data.ai_response }
          ]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentModuleTitle = curriculum?.modules?.[currentModuleIndex]?.title || "Module 1: The Foundation";
  const currentModuleConcepts = (curriculum?.modules?.[currentModuleIndex]?.concepts || []).map(c =>
    typeof c === 'string' ? c : c.title
  );
  
  // Safe extraction of concept title
  const currentConceptsList = curriculum?.modules?.[currentModuleIndex]?.concepts || [];
  const currentConceptData = currentConceptsList[currentConceptIndex];
  const currentConceptTitle = currentConceptData 
      ? (typeof currentConceptData === 'string' ? currentConceptData : currentConceptData.title) 
      : "1.1 Core Principles";

  // Called by ModuleTestView when the student passes (score >= 70)
  const handleTestComplete = async (nextModuleIndex, score) => {
    setIsTestingMode(false);
    setCurrentModuleIndex(nextModuleIndex);
    setCurrentConceptIndex(0);
    const sid = localStorage.getItem('session_id');
    setMessages([
      { role: 'agent', content: `🎉 Excellent! You passed the module test with ${score}%! Your notes and mastery report have been generated. Let\'s begin the next module!` }
    ]);
    // Re-init chat for the new module
    if (curriculum) await initChat(sid, curriculum, nextModuleIndex, 0);
  };

  return (
    <div ref={wrapperRef} className={`sanctuary-wrapper ${isFocusMode ? 'focus-mode' : ''}`}>
      {/* Background with Zen light theme elements */}
      <div className="sanctuary-bg"></div>

      <div className="sanctuary-layout">
        {/* Left Sidebar */}
        <motion.div 
          className="sanctuary-sidebar"
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="sidebar-logo">ADAPTIVE MINDS</div>
          
          <nav className="sidebar-nav">
            <a href="#" className={activeTab === 'learning' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('learning'); }}><span className="icon">📚</span> My Learning</a>
            <a href="#" className={activeTab === 'reports' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('reports'); }}><span className="icon">📊</span> Reports</a>
            <a href="#" className={activeTab === 'notes' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('notes'); }}><span className="icon">📝</span> Notes</a>
            <a href="#" className={activeTab === 'flashcards' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('flashcards'); }}><span className="icon">📇</span> Flash Cards</a>
          </nav>

          <div className="sidebar-context">
            <h3 className="context-label">Current Focus</h3>
            <p className="context-title">{currentConceptTitle}</p>
            <div className="context-progress">
              <div className="progress-fill" style={{ width: '15%' }}></div>
            </div>
            
            <div className="action-buttons">
              <button
                className="sidebar-action-btn primary-glow"
                disabled={isGeneratingFlash || isProcessing}
                onClick={async () => {
                  if (!currentConceptTitle) return;
                  setIsGeneratingFlash(true);
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/flashcards`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || ''
                      },
                      body: JSON.stringify({ concept: currentConceptTitle })
                    });
                    const data = await res.json();
                    if (data.status === 'success' && data.cards?.length) {
                      // Add new deck (or replace existing for same concept)
                      setFlashDecks(prev => {
                        const filtered = prev.filter(d => d.concept !== data.concept);
                        return [{ concept: data.concept, cards: data.cards }, ...filtered];
                      });
                      setActiveTab('flashcards'); // navigate to view the generated deck
                    }
                  } catch (e) {
                    console.error('Flashcard generation failed:', e);
                  } finally {
                    setIsGeneratingFlash(false);
                  }
                }}
              >
                {isGeneratingFlash ? '⏳ Generating...' : '✨ Generate Flashcards'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right Main Area */}
        <motion.div 
          className="sanctuary-main"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Module Test Overlay — shown when agent signals is_testing_mode */}
          <AnimatePresence>
            {isTestingMode && (
              <motion.div
                className="mtest-overlay"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <ModuleTestView
                  moduleTitle={currentModuleTitle}
                  concepts={currentModuleConcepts}
                  moduleIndex={currentModuleIndex}
                  curriculum={curriculum}
                  onTestComplete={handleTestComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {activeTab === 'learning' && (
            <>
              <div className="chat-header">
                <div className="header-info">
                  <h2>Deep Mastery Session</h2>
                  <p>{currentModuleTitle}</p>
                </div>
                <div className="header-controls">
                  
                  <motion.button
                    onClick={toggleFocus}
                    whileHover={{ scale: 1.04 }} 
                    whileTap={{ scale: 0.96 }}
                    className="zen-control-btn"
                  >
                    <span>{isFocusMode ? '⊠' : '⊞'}</span>
                    {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
                  </motion.button>
                  
                  <motion.button
                    onClick={toggleSound}
                    whileHover={{ scale: 1.04 }} 
                    whileTap={{ scale: 0.96 }}
                    className="zen-control-btn"
                  >
                    <span>{soundOn ? '🔊' : '🔇'}</span>
                  </motion.button>


                  
                  <PomodoroClock />
                </div>
              </div>

              <div className="chat-history">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message-wrapper ${msg.role}`}>
                    <div className={`message-bubble ${msg.role === 'agent' ? 'markdown-body' : ''}`}>
                      {msg.role === 'agent' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-area">
                <div className="chat-input-wrapper">
                  <input 
                    type="text" 
                    placeholder={isProcessing ? "Agent is thinking..." : "Ask a question or share your thoughts to dive deeper..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isProcessing}
                  />
                  <button className="send-btn" onClick={handleSend}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </div>

              </div>
            </>
          )}

          {activeTab === 'flashcards' && <FlashcardsView decks={flashDecks} setDecks={setFlashDecks} currentConcept={currentConceptTitle} />}
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'reports' && <ReportsView />}
        </motion.div>
      </div>
    </div>
  );
}
