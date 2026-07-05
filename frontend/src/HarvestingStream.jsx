import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalSound } from './SoundContext';
import './ForestScene.css';

/* ═══════════════════════════════════════════════════════════════════════════
   Constants & pre-computed layout data
   ═══════════════════════════════════════════════════════════════════════════ */

const ZEN_THOUGHTS = [
  "Sifting through the noise. Distilling pure signal.",
  "Every great mind begins with curiosity.",
  "The agent is reading, evaluating, and building your world.",
  "Knowledge is a river. We are finding its clearest stream.",
  "Deep learning requires deep patience.",
  "Curating only what truly matters, for you.",
];

/* Deterministic tree data — avoids Math.random() on every render */
const DISTANT_TREES = Array.from({ length: 32 }, (_, i) => ({
  x: (i * 1480 / 31) + ((i % 4) - 2) * 6,
  height: 88 + (i * 7) % 38,
  dur: [2.6, 3.1, 3.6][i % 3],
  delay: (i * 0.29) % 4.5,
}));

const MIDDLE_TREES = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 1520 / 19) - 20 + (i % 3) * 10,
  height: 145 + (i * 11) % 55,
  dur: [2.8, 3.4, 4.0][i % 3],
  delay: (i * 0.42) % 5,
}));

const CLOSE_TREES = Array.from({ length: 11 }, (_, i) => ({
  x: (i * 1500 / 10) - 10 + (i % 2) * 18,
  height: 230 + (i * 18) % 80,
  dur: [3.2, 3.8, 4.4][i % 3],
  delay: (i * 0.6) % 6,
}));

/* Bird offsets within a flock (V-formation) */
const BIRD_OFFSETS = [
  { x: 0, y: 0 }, { x: 24, y: -10 }, { x: -24, y: -10 },
  { x: 46, y: -5 }, { x: -46, y: -5 }, { x: 66, y: 2 },
  { x: -66, y: 2 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Pine Tree (SVG — 3-tier silhouette, CSS sway animation)
   ═══════════════════════════════════════════════════════════════════════════ */
function PineTree({ x, baseY, height, dur, delay, color }) {
  const w = height * 0.36;
  return (
    <g transform={`translate(${x},${baseY})`}>
      <g style={{
        transformBox: 'fill-box', transformOrigin: '50% 100%',
        animation: `treeSway ${dur}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}>
        {/* Top tier */}
        <polygon points={`0,${-height} ${w * 0.36},${-height * 0.60} ${-w * 0.36},${-height * 0.60}`} fill={color} />
        {/* Mid tier */}
        <polygon points={`0,${-height * 0.66} ${w * 0.62},${-height * 0.30} ${-w * 0.62},${-height * 0.30}`} fill={color} />
        {/* Base tier */}
        <polygon points={`0,${-height * 0.36} ${w},0 ${-w},0`} fill={color} />
        {/* Trunk */}
        <rect x={-w * 0.07} y={0} width={w * 0.14} height={height * 0.17} fill={color} />
      </g>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Bird (M-shape wing silhouette)
   ═══════════════════════════════════════════════════════════════════════════ */
function BirdShape({ dx, dy, s = 13 }) {
  return (
    <g transform={`translate(${dx},${dy})`}
      style={{
        transformBox: 'fill-box', transformOrigin: '50% 50%',
        animation: `wingFlap ${0.38 + (Math.abs(dx) % 5) * 0.04}s ease-in-out infinite`,
        animationDelay: `${(Math.abs(dx) * 0.02) % 0.3}s`
      }}>
      <path
        d={`M0,0 C${-s * .45},${-s * .65} ${-s * 1.15},${-s * .3} ${-s * 1.65},${-s * .85}` +
          ` C${-s * 1.1},${-s * .25} ${-s * .4},${-s * .7} 0,0` +
          ` C${s * .4},${-s * .7} ${s * 1.1},${-s * .25} ${s * 1.65},${-s * .85}` +
          ` C${s * 1.15},${-s * .3} ${s * .45},${-s * .65} 0,0Z`}
        fill="#0b1808"
      />
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Deer Silhouette (SVG with animated legs)
   ═══════════════════════════════════════════════════════════════════════════ */
function DeerSilhouette({ opacity = 1, scale = 1 }) {
  const c = '#0b150b';
  const leg = (anim, ox, oy) => ({
    transformBox: 'view-box',
    transformOrigin: `${ox}px ${oy}px`,
    animation: `${anim} 0.52s ease-in-out infinite`,
  });
  return (
    <svg
      width={140 * scale} height={100 * scale}
      viewBox="-62 -88 145 105"
      style={{ overflow: 'visible', opacity }}
    >
      {/* Body */}
      <ellipse cx="0" cy="0" rx="30" ry="13" fill={c} />
      {/* Neck */}
      <path d="M14,-5 L22,-26" stroke={c} strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Head */}
      <ellipse cx="26" cy="-32" rx="12" ry="9" fill={c} />
      {/* Snout */}
      <ellipse cx="36" cy="-30" rx="5" ry="4" fill={c} />
      {/* Eye glint */}
      <circle cx="29" cy="-36" r="1.5" fill="rgba(255,200,130,0.65)" />
      {/* Antlers */}
      <g stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21,-40 L17,-60 M17,-54 L11,-63 M17,-54 L22,-65" />
        <path d="M29,-40 L33,-60 M33,-54 L38,-63 M33,-54 L28,-65" />
      </g>
      {/* Tail */}
      <ellipse cx="-29" cy="-4" rx="6" ry="4.5" fill={c} />
      {/* Front-left leg */}
      <g style={leg('legFwd', -10, 12)}>
        <path d="M-10,12 L-14,44 L-17,48" stroke={c} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      </g>
      {/* Front-right leg */}
      <g style={leg('legBack', 4, 12)}>
        <path d="M4,12 L7,44 L4,48" stroke={c} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      </g>
      {/* Back-left leg */}
      <g style={leg('legBack', -18, 10)}>
        <path d="M-18,10 L-22,40 L-26,44" stroke={c} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      </g>
      {/* Back-right leg */}
      <g style={leg('legFwd', -6, 12)}>
        <path d="M-6,12 L-3,42 L0,46" stroke={c} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Firefly Canvas
   ═══════════════════════════════════════════════════════════════════════════ */
function FireflyCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const flies = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight * 0.48 + Math.random() * window.innerHeight * 0.48,
      phase: Math.random() * Math.PI * 2,
      speed: 0.007 + Math.random() * 0.013,
      size: 1.4 + Math.random() * 2.2,
      dx: (Math.random() - 0.5) * 0.28,
      dy: -(Math.random() * 0.14 + 0.04),
    }));

    let id;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      flies.forEach(f => {
        f.phase += f.speed;
        f.x += f.dx; f.y += f.dy;
        if (f.y < canvas.height * 0.42) f.y = canvas.height * 0.94;
        if (f.x < -8) f.x = canvas.width + 8;
        if (f.x > canvas.width + 8) f.x = -8;

        const alpha = (Math.sin(f.phase) + 1) / 2;
        if (alpha > 0.08) {
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3.5);
          g.addColorStop(0, `rgba(210,255,110,${alpha * 0.95})`);
          g.addColorStop(0.5, `rgba(160,230,70,${alpha * 0.35})`);
          g.addColorStop(1, 'transparent');
          ctx.beginPath(); ctx.fillStyle = g;
          ctx.arc(f.x, f.y, f.size * 3.5, 0, Math.PI * 2); ctx.fill();
          /* bright core */
          ctx.beginPath(); ctx.fillStyle = `rgba(240,255,170,${alpha})`;
          ctx.arc(f.x, f.y, f.size * 0.55, 0, Math.PI * 2); ctx.fill();
        }
      });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none' }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Forest Background  (the complete living landscape)
   ═══════════════════════════════════════════════════════════════════════════ */
function ForestBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>

      {/* ── Sky gradient ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(
          to bottom,
          #09111e 0%,
          #152338 18%,
          #1e3050 36%,
          #5c4418 58%,
          #c87820 68%,
          #1e4028 78%,
          #0e2618 90%,
          #070f09 100%
        )`,
        zIndex: 1,
      }} />

      {/* ── Horizon glow (animated soft pulse) ── */}
      <div style={{
        position: 'absolute', left: '-10%', right: '-10%',
        top: '60%', height: '180px',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(220,140,30,0.7) 0%, rgba(180,90,10,0.25) 50%, transparent 80%)',
        filter: 'blur(28px)',
        animation: 'horizonBreathe 6s ease-in-out infinite',
        zIndex: 2,
      }} />

      {/* ── Drifting clouds ── */}
      {[
        { top: '6%', width: 340, height: 75, delay: 0, dur: 52, dir: 'right' },
        { top: '11%', width: 260, height: 60, delay: 18, dur: 65, dir: 'left' },
        { top: '4%', width: 200, height: 55, delay: 35, dur: 45, dir: 'right' },
        { top: '16%', width: 320, height: 65, delay: 8, dur: 58, dir: 'left' },
      ].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', top: c.top, left: c.dir === 'right' ? '-350px' : undefined,
          right: c.dir === 'left' ? '-350px' : undefined,
          width: c.width, height: c.height,
          background: 'rgba(255,245,225,0.07)',
          borderRadius: '50px',
          filter: 'blur(22px)',
          animation: `${c.dir === 'right' ? 'cloudRight' : 'cloudLeft'} ${c.dur}s linear infinite`,
          animationDelay: `${c.delay}s`,
          zIndex: 3,
        }} />
      ))}

      {/* ── Forest SVG (trees + mist) ── */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 4 }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Distant tree layer */}
        {DISTANT_TREES.map((t, i) => (
          <PineTree key={`d${i}`} x={t.x} baseY={665} height={t.height}
            dur={t.dur} delay={t.delay} color="#0c1d0e" />
        ))}

        {/* Mist layer 1 (between distant and middle) */}
        <ellipse cx="720" cy="660" rx="900" ry="42" fill="rgba(218,200,165,0.28)"
          style={{ animation: 'mistDrift 14s ease-in-out infinite' }} />

        {/* Middle tree layer */}
        {MIDDLE_TREES.map((t, i) => (
          <PineTree key={`m${i}`} x={t.x} baseY={705} height={t.height}
            dur={t.dur} delay={t.delay} color="#081508" />
        ))}

        {/* Mist layer 2 (between middle and close) */}
        <ellipse cx="720" cy="705" rx="840" ry="34" fill="rgba(228,212,178,0.32)"
          style={{ animation: 'mistDrift2 18s ease-in-out infinite' }} />

        {/* Foreground / close tree layer */}
        {CLOSE_TREES.map((t, i) => (
          <PineTree key={`c${i}`} x={t.x} baseY={748} height={t.height}
            dur={t.dur} delay={t.delay} color="#040c04" />
        ))}

        {/* Ground fill */}
        <rect x="0" y="755" width="1440" height="145" fill="#040c04" />

        {/* Very subtle ground mist */}
        <ellipse cx="720" cy="758" rx="900" ry="25" fill="rgba(220,205,170,0.18)"
          style={{ animation: 'mistDrift 22s ease-in-out infinite', animationDelay: '4s' }} />
      </svg>

      {/* ── Bird flocks ── */}
      {/* Flock 1 — flies left to right, high */}
      <div style={{
        position: 'absolute', top: '11%', left: 0, zIndex: 5,
        animation: 'birdL2R 32s linear infinite',
        animationDelay: '4s',
      }}>
        <svg width="160" height="60" viewBox="-80 -30 160 60" overflow="visible">
          {BIRD_OFFSETS.map((b, i) => <BirdShape key={i} dx={b.x} dy={b.y} s={12} />)}
        </svg>
      </div>

      {/* Flock 2 — flies right to left, lower */}
      <div style={{
        position: 'absolute', top: '21%', right: 0, zIndex: 5,
        animation: 'birdR2L 42s linear infinite',
        animationDelay: '18s',
      }}>
        <svg width="140" height="55" viewBox="-70 -28 140 55" overflow="visible">
          {BIRD_OFFSETS.slice(0, 5).map((b, i) => <BirdShape key={i} dx={b.x} dy={b.y} s={10} />)}
        </svg>
      </div>

      {/* Flock 3 — small, distant, very high */}
      <div style={{
        position: 'absolute', top: '6%', left: 0, zIndex: 5,
        animation: 'birdL2R 55s linear infinite',
        animationDelay: '28s',
      }}>
        <svg width="90" height="40" viewBox="-45 -20 90 40" overflow="visible">
          {BIRD_OFFSETS.slice(0, 4).map((b, i) => <BirdShape key={i} dx={b.x * 0.6} dy={b.y * 0.6} s={7} />)}
        </svg>
      </div>

      {/* ── Deer 1 — main foreground deer (right→left) ── */}
      <div style={{
        position: 'absolute', bottom: '10%', left: 0, zIndex: 7,
        animation: 'deerWalk 34s linear infinite', animationDelay: '6s'
      }}>
        <div style={{ animation: 'deerBob 0.52s ease-in-out infinite' }}>
          <DeerSilhouette opacity={1} scale={1} />
        </div>
      </div>

      {/* ── Deer 2 — smaller, mid-distance (left→right, mirrored) ── */}
      <div style={{
        position: 'absolute', bottom: '14.5%', left: 0, zIndex: 6,
        animation: 'deerWalk2 45s linear infinite', animationDelay: '20s'
      }}>
        <div style={{ animation: 'deerBob 0.6s ease-in-out infinite', animationDelay: '0.26s' }}>
          <DeerSilhouette opacity={0.55} scale={0.65} />
        </div>
      </div>

      {/* ── Fireflies canvas ── */}
      <FireflyCanvas />

      {/* ── Warm ivory veil — makes forest feel like dawn mist,
              and keeps UI readable ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 13,
        background: 'rgba(244,241,234,0.48)',
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Source Card
   ═══════════════════════════════════════════════════════════════════════════ */
function SourceCard({ item, index }) {
  const passed = item.status === 'accepted';
  const domain = (() => {
    try { return new URL(item.url).hostname.replace('www.', ''); }
    catch { return item.url.length > 52 ? item.url.slice(0, 50) + '…' : item.url; }
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.04, 0.5) }}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.85rem',
        padding: '0.72rem 1rem', borderRadius: '12px', marginBottom: '0.45rem',
        background: passed ? 'rgba(135,156,137,0.09)' : 'rgba(180,90,90,0.07)',
        border: `1px solid ${passed ? 'rgba(135,156,137,0.22)' : 'rgba(180,90,90,0.16)'}`,
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18, delay: Math.min(index * 0.04 + 0.1, 0.6) }}
        style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: passed ? 'rgba(135,156,137,0.2)' : 'rgba(180,90,90,0.14)',
          fontSize: '0.8rem', color: passed ? '#4a7a4c' : '#a04040',
          fontWeight: 700,
        }}
      >
        {passed ? '✓' : '✕'}
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.875rem', fontWeight: 500, color: '#2C352E',
          fontFamily: "'Outfit', sans-serif",
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {domain}
        </div>
        <div style={{
          fontSize: '0.74rem', marginTop: '0.1rem', fontWeight: 300,
          fontFamily: "'Outfit', sans-serif",
          color: passed ? '#879C89' : '#B45A5A',
        }}>
          {passed ? 'Verified — added to knowledge base' : 'Not relevant enough — discarded'}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function HarvestingStream({ topic, jobId, onComplete }) {
  const [sources, setSources] = useState([]);
  const [phase, setPhase] = useState('running');
  const [thoughtIdx, setThoughtIdx] = useState(0);
  const [message, setMessage] = useState('Waking the agent…');
  const [isFS, setIsFS] = useState(false);
  const seenUrls = useRef(new Set());
  const listRef = useRef(null);
  const wrapperRef = useRef(null);
  const { soundOn, toggleSound } = useGlobalSound();

  /* Rotate Zen thoughts */
  useEffect(() => {
    const id = setInterval(() => setThoughtIdx(i => (i + 1) % ZEN_THOUGHTS.length), 6500);
    return () => clearInterval(id);
  }, []);

  /* Auto-scroll feed */
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [sources]);

  /* Poll backend */
  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/onboard/status/${jobId}`,
          { headers: { 'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || '' } }
        );
        const data = await res.json();
        setMessage(data.message || 'Working…');

        const incoming = data.sources || [];
        incoming.forEach(s => {
          if (!seenUrls.current.has(s.url)) {
            seenUrls.current.add(s.url);
            setSources(prev => [...prev, s]);
          }
        });

        if (data.status === 'completed') {
          setPhase('done');
          setTimeout(() => onComplete && onComplete(data.curriculum), 2800);
        } else if (data.status === 'failed') {
          setPhase('failed');
        }
      } catch (e) { console.error('Poll:', e); }
    };
    const id = setInterval(poll, 2000);
    poll();
    return () => clearInterval(id);
  }, [jobId, onComplete]);

  /* Focus Mode */
  const toggleFocus = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFS(true);
    } else {
      document.exitFullscreen?.();
      setIsFS(false);
    }
  };

  const accepted = sources.filter(s => s.status === 'accepted').length;
  const rejected = sources.filter(s => s.status === 'rejected').length;
  const card = (children, extra = {}) => ({
    background: 'rgba(252,250,246,0.72)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    border: '1px solid rgba(255,255,255,0.78)',
    borderRadius: '20px',
    boxShadow: '0 4px 24px rgba(44,53,46,0.07)',
    ...extra,
  });

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative', width: '100vw', height: '100vh',
        overflow: 'hidden', fontFamily: "'Outfit', sans-serif", color: '#2C352E',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ── Living Forest ── */}
      <ForestBackground />

      {/* ══ UI (sits above the forest at z-index 20+) ══════════════════════ */}

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        style={{
          position: 'relative', zIndex: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.4rem 2.5rem',
        }}
      >
        <span style={{
          fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.13em',
          textTransform: 'uppercase', color: '#2C352E', opacity: 0.55,
        }}>
          Adaptive Minds
        </span>

        <div style={{ display: 'flex', gap: '0.7rem' }}>
          {/* Sound toggle */}
          <motion.button
            onClick={toggleSound}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            title={soundOn ? 'Mute forest sounds' : 'Play forest sounds'}
            style={{
              padding: '0.52rem 1.1rem', borderRadius: '30px',
              border: '1px solid rgba(44,53,46,0.16)',
              background: soundOn ? 'rgba(135,156,137,0.25)' : 'rgba(255,255,255,0.55)',
              color: '#2C352E', fontSize: '0.82rem', fontWeight: 500,
              cursor: 'pointer', backdropFilter: 'blur(10px)',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex', alignItems: 'center', gap: '0.45rem',
            }}
          >
            <span>{soundOn ? '🔊' : '🔇'}</span>
            {soundOn ? 'Forest On' : 'Sounds Off'}
          </motion.button>

          {/* Focus Mode */}
          <motion.button
            onClick={toggleFocus}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            style={{
              padding: '0.52rem 1.2rem', borderRadius: '30px',
              border: '1px solid rgba(44,53,46,0.16)',
              background: isFS ? '#2C352E' : 'rgba(255,255,255,0.55)',
              color: isFS ? '#F4F1EA' : '#2C352E',
              fontSize: '0.82rem', fontWeight: 500,
              cursor: 'pointer', backdropFilter: 'blur(10px)',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              transition: 'background 0.3s, color 0.3s',
            }}
          >
            <span>{isFS ? '⊠' : '⊞'}</span>
            {isFS ? 'Exit Focus' : 'Focus Mode'}
          </motion.button>
        </div>
      </motion.div>

      {/* Rotating Zen thought */}
      <div style={{
        position: 'relative', zIndex: 20, textAlign: 'center',
        padding: '0 2rem', marginBottom: '1.2rem',
        height: '2.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={thoughtIdx}
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 1.2 }}
            style={{
              fontFamily: "'Lora', serif", fontSize: 'clamp(0.95rem, 2vw, 1.25rem)',
              fontWeight: 400, color: 'rgba(44,53,46,0.65)', fontStyle: 'italic',
              letterSpacing: '0.02em', margin: 0,
            }}
          >
            {ZEN_THOUGHTS[thoughtIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Two-column layout */}
      <div style={{
        position: 'relative', zIndex: 20, flex: 1,
        display: 'flex', gap: '1.4rem',
        padding: '0 2.4rem 2rem',
        maxWidth: 1200, width: '100%', margin: '0 auto', minHeight: 0,
      }}>

        {/* ── LEFT: Status + stats ── */}
        <motion.div
          initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {/* Status */}
          <div style={{ ...card(), padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.9rem' }}>
              {phase === 'running' && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#879C89', flexShrink: 0 }}
                />
              )}
              {phase === 'done' && <span style={{ color: '#4a7a4c' }}>✓</span>}
              {phase === 'failed' && <span style={{ color: '#B45A5A' }}>✕</span>}
              <span style={{ fontSize: '0.76rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#6A786B' }}>
                {phase === 'running' ? 'Agent Active' : phase === 'done' ? 'Complete' : 'Error'}
              </span>
            </div>
            <p style={{ fontSize: '0.87rem', color: '#6A786B', lineHeight: 1.55, fontWeight: 300, margin: 0 }}>
              {message}
            </p>
          </div>

          {/* Stats */}
          <div style={{ ...card(), padding: '1.5rem' }}>
            <p style={{ fontSize: '0.76rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#6A786B', margin: '0 0 1rem' }}>
              Knowledge Harvest
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', color: '#6A786B' }}>Verified</span>
                <motion.span key={accepted} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                  style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4a7a4c' }}>
                  {accepted}
                </motion.span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', color: '#6A786B' }}>Discarded</span>
                <motion.span key={rejected} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                  style={{ fontSize: '1.1rem', fontWeight: 600, color: '#B45A5A' }}>
                  {rejected}
                </motion.span>
              </div>
              {sources.length > 0 && (
                <div style={{ marginTop: '0.2rem' }}>
                  <div style={{ height: 4, background: 'rgba(44,53,46,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div
                      animate={{ width: `${(accepted / Math.max(sources.length, 1)) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', background: 'linear-gradient(to right, #879C89, #4a7a4c)', borderRadius: 4 }}
                    />
                  </div>
                  <p style={{ fontSize: '0.73rem', color: '#6A786B', marginTop: '0.35rem', fontWeight: 300 }}>
                    {Math.round((accepted / Math.max(sources.length, 1)) * 100)}% acceptance rate
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Topic */}
          <div style={{
            background: 'rgba(135,156,137,0.11)', border: '1px solid rgba(135,156,137,0.26)',
            borderRadius: '14px', padding: '1rem 1.2rem',
          }}>
            <p style={{ fontSize: '0.74rem', color: '#879C89', textTransform: 'uppercase', letterSpacing: '0.13em', margin: '0 0 0.4rem' }}>
              Learning topic
            </p>
            <p style={{ fontSize: '1rem', fontFamily: "'Lora', serif", color: '#2C352E', fontWeight: 400, margin: 0 }}>
              {topic}
            </p>
          </div>
        </motion.div>

        {/* ── RIGHT: Live source feed ── */}
        <motion.div
          initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          style={{ ...card(), flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {/* Feed header */}
          <div style={{
            padding: '1.1rem 1.5rem', flexShrink: 0,
            borderBottom: '1px solid rgba(44,53,46,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              {phase === 'running' && (
                <motion.div
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#879C89' }}
                />
              )}
              <span style={{ fontSize: '0.76rem', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#6A786B' }}>
                Live Source Feed
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#6A786B' }}>{sources.length} discovered</span>
          </div>

          {/* Scrollable list */}
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
            {sources.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.45 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #879C89', borderTopColor: 'transparent' }}
                />
                <p style={{ fontSize: '0.88rem', color: '#6A786B', fontWeight: 300, margin: 0 }}>
                  Searching the web for the best sources…
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {[...sources].reverse().map((item, i) => (
                  <SourceCard key={item.url + i} item={item} index={i} />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Completion banner */}
          <AnimatePresence>
            {phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '0.9rem 1.5rem', flexShrink: 0,
                  background: 'rgba(135,156,137,0.1)',
                  borderTop: '1px solid rgba(135,156,137,0.2)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.9rem', color: '#6A786B', fontFamily: "'Lora', serif", fontStyle: 'italic', margin: 0 }}>
                  Curriculum assembled. Entering your sanctuary…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
