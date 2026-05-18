import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DIFFICULTY_COLOR = {
  easy:   { dot: '#a3ad9e', label: 'Easy' },
  medium: { dot: '#c4a96d', label: 'Medium' },
  hard:   { dot: '#c47a6d', label: 'Hard' },
};

function FlashCard({ card, index, total }) {
  const [flipped, setFlipped] = useState(false);
  const diff = DIFFICULTY_COLOR[card.difficulty] || DIFFICULTY_COLOR.easy;

  // Reset flip when card changes
  useEffect(() => { setFlipped(false); }, [card]);

  return (
    <div className="fc-card-scene" onClick={() => setFlipped(f => !f)}>
      <motion.div
        className="fc-card-inner"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, type: 'spring', stiffness: 240, damping: 22 }}
      >
        {/* Front */}
        <div className="fc-face fc-front">
          <div className="fc-diff-badge" style={{ background: diff.dot + '22', color: diff.dot, borderColor: diff.dot + '55' }}>
            <span className="fc-diff-dot" style={{ background: diff.dot }} />
            {diff.label}
          </div>
          <div className="fc-counter">{index + 1} / {total}</div>
          <h3 className="fc-question">{card.front}</h3>
          <p className="fc-flip-hint">Click to reveal answer</p>
        </div>

        {/* Back */}
        <div className="fc-face fc-back">
          <div className="fc-concept-tag">{card.concept}</div>
          <p className="fc-answer">{card.back}</p>
          <p className="fc-flip-hint">Click to flip back</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function FlashcardsView({ decks = [], setDecks, currentConcept }) {
  const [selectedDeckIdx, setSelectedDeckIdx] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [masteredSet, setMasteredSet] = useState(new Set());

  // Load saved decks from backend on mount, merge with in-memory decks
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/flashcards/all`, {
      headers: { 'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || '' }
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success' && data.decks?.length) {
          // Merge: in-memory decks (newly generated) take priority
          setDecks(prev => {
            const inMemoryConcepts = new Set(prev.map(d => d.concept));
            const fromDisk = data.decks.filter(d => !inMemoryConcepts.has(d.concept));
            return [...prev, ...fromDisk];
          });
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  // When decks prop changes (new deck generated), select the first one
  useEffect(() => {
    setSelectedDeckIdx(0);
    setCardIndex(0);
    setMasteredSet(new Set());
  }, [decks.length]);

  const allDecks = decks;
  const selectedDeck = allDecks[selectedDeckIdx] || null;
  const cards = selectedDeck?.cards || [];
  const currentCard = cards[cardIndex] || null;

  const handleNext = () => {
    setCardIndex(i => Math.min(i + 1, cards.length - 1));
  };

  const handlePrev = () => {
    setCardIndex(i => Math.max(i - 1, 0));
  };

  const handleMastered = () => {
    setMasteredSet(prev => new Set([...prev, cardIndex]));
    if (cardIndex < cards.length - 1) handleNext();
  };

  const handleRestart = () => {
    setCardIndex(0);
    setMasteredSet(new Set());
  };

  // ── Empty state ──
  if (allDecks.length === 0) {
    return (
      <div className="flashcards-view">
        <div className="view-header">
          <div>
            <h2>Flash Cards</h2>
            <p>Generate cards from any concept you're studying.</p>
          </div>
        </div>
        <div className="fc-empty-state">
          <div className="fc-empty-icon">🃏</div>
          <h3>No Flashcards Yet</h3>
          <p>
            Click <strong>✨ Generate Flashcards</strong> in the sidebar while studying a concept.
            Cards will be stored here so you can review them anytime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcards-view">
      <div className="view-header">
        <div>
          <h2>Flash Cards</h2>
          <p>{allDecks.length} deck{allDecks.length !== 1 ? 's' : ''} saved</p>
        </div>
        {selectedDeck && (
          <div className="fc-progress-pill">
            {masteredSet.size} / {cards.length} mastered
          </div>
        )}
      </div>

      <div className="fc-layout">
        {/* Left: deck list */}
        <div className="fc-deck-list">
          {allDecks.map((deck, idx) => (
            <motion.div
              key={deck.concept}
              className={`fc-deck-item ${idx === selectedDeckIdx ? 'active' : ''}`}
              onClick={() => { setSelectedDeckIdx(idx); setCardIndex(0); setMasteredSet(new Set()); }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="fc-deck-icon">🃏</div>
              <div className="fc-deck-text">
                <span className="fc-deck-concept">{deck.concept}</span>
                <span className="fc-deck-count">{deck.cards?.length || 0} cards</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right: card viewer */}
        <div className="fc-viewer">
          {selectedDeck && currentCard ? (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedDeckIdx}-${cardIndex}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="fc-card-wrapper"
                >
                  <FlashCard
                    card={currentCard}
                    index={cardIndex}
                    total={cards.length}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="fc-dots">
                {cards.map((_, i) => (
                  <button
                    key={i}
                    className={`fc-dot ${i === cardIndex ? 'active' : ''} ${masteredSet.has(i) ? 'mastered' : ''}`}
                    onClick={() => setCardIndex(i)}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="fc-controls">
                <button className="fc-ctrl-btn secondary" onClick={handlePrev} disabled={cardIndex === 0}>
                  ← Prev
                </button>
                <button className="fc-ctrl-btn review" onClick={handleNext} disabled={cardIndex === cards.length - 1}>
                  Needs Review
                </button>
                <button className="fc-ctrl-btn mastered" onClick={handleMastered}>
                  ✓ Mastered
                </button>
                <button className="fc-ctrl-btn secondary" onClick={handleNext} disabled={cardIndex === cards.length - 1}>
                  Next →
                </button>
              </div>

              {/* All mastered banner */}
              {masteredSet.size === cards.length && (
                <motion.div
                  className="fc-complete-banner"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  🎉 You've mastered all cards in this deck!
                  <button className="fc-restart-btn" onClick={handleRestart}>Restart Deck</button>
                </motion.div>
              )}
            </>
          ) : (
            <div className="fc-empty-state">
              <div className="fc-empty-icon">👈</div>
              <p>Select a deck from the left to start reviewing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
