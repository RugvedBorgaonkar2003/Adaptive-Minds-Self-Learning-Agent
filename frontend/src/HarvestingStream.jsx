import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SANCTUARY_THOUGHTS = [
  "Curating the top 1% of human knowledge...",
  "Filtering out the noise. Extracting pure signal...",
  "Connecting disparate concepts into a unified graph...",
  "Building your personalized learning sanctuary...",
  "Deep learning requires deep focus..."
];

export default function HarvestingStream({ topic, jobId, onComplete }) {
  const [logs, setLogs] = useState([]);
  const [nodes, setNodes] = useState(0);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [knownUrls, setKnownUrls] = useState(new Set());
  const logsEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Rotate thoughts
  useEffect(() => {
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % SANCTUARY_THOUGHTS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Poll backend
  useEffect(() => {
    if (!jobId) return;
    
    setLogs([{ type: 'info', text: `> Target Concept: "${topic || 'Unknown'}"` }]);
    setLogs(prev => [...prev, { type: 'info', text: `> Orchestrator: Initializing Adaptive Agent framework...` }]);
    
    let intervalId;
    
    const pollStatus = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/onboard/status/${jobId}`, {
          headers: { 'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || '' }
        });
        const data = await res.json();
        
        const currentUrls = data.extracted_urls || [];
        
        setKnownUrls(prevSet => {
          const newSet = new Set(prevSet);
          currentUrls.forEach(url => {
            if (!prevSet.has(url)) {
              newSet.add(url);
              setLogs(prevLogs => [
                ...prevLogs, 
                { type: 'crawling', text: `> Crawling: ${url.substring(0, 50)}...` },
                { type: 'accept', text: `> Quality Gate: Source accepted. Synthesizing vectors...` }
              ]);
              setNodes(n => Math.min(n + 1, 5)); // cap visual nodes to 5 for UI polish
            }
          });
          return newSet;
        });

        if (data.status === 'completed') {
          clearInterval(intervalId);
          setLogs(prevLogs => [
            ...prevLogs, 
            { type: 'success', text: '> Orchestrator: Curriculum successfully generated. Sanctuary ready.' }
          ]);
          setNodes(5);
          setTimeout(() => {
            if (onComplete) onComplete(data.curriculum);
          }, 3000);
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          setLogs(prevLogs => [
            ...prevLogs, 
            { type: 'reject', text: `> Error: ${data.message}` }
          ]);
        } else {
          // Status update
          if (Math.random() > 0.7) {
             setLogs(prevLogs => [...prevLogs, { type: 'search', text: `> ${data.message || 'Processing knowledge...'}` }]);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    intervalId = setInterval(pollStatus, 2000);
    return () => clearInterval(intervalId);
  }, [jobId, topic, onComplete]);

  return (
    <div className="harvesting-container">
      {/* Dynamic Background Orb */}
      <motion.div 
        className="harvesting-orb"
        animate={{ 
          scale: [1, 1.2, 0.9, 1.1, 1],
          opacity: [0.15, 0.3, 0.1, 0.2, 0.15],
          rotate: [0, 90, 180, 270, 360]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Sanctuary Thoughts (Top) */}
      <div className="thoughts-container">
        <AnimatePresence mode="wait">
          <motion.h2
            key={thoughtIndex}
            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            transition={{ duration: 1.5 }}
            className="sanctuary-thought"
          >
            {SANCTUARY_THOUGHTS[thoughtIndex]}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="harvesting-ui-wrapper">
        {/* Left: Telemetry Feed */}
        <div className="telemetry-panel">
          <div className="telemetry-header">
            <span className="pulsing-dot"></span>
            LIVE TELEMETRY
          </div>
          <div className="telemetry-logs">
            <AnimatePresence initial={false}>
              {logs.map((log, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`log-entry log-${log.type}`}
                >
                  {log.text}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Right: Knowledge Nodes */}
        <div className="nodes-panel">
          <div className="nodes-header">KNOWLEDGE GRAPH</div>
          <div className="nodes-grid">
            {[...Array(5)].map((_, i) => (
              <motion.div 
                key={i}
                className={`knowledge-node ${i < nodes ? 'active' : ''}`}
                initial={{ opacity: 0.2, scale: 0.8 }}
                animate={i < nodes ? { 
                  opacity: 1, 
                  scale: [1, 1.2, 1],
                  boxShadow: ["0 0 0px var(--color-moss)", "0 0 30px var(--color-moss)", "0 0 15px var(--color-moss)"]
                } : {}}
                transition={{ duration: 1 }}
              >
                {i < nodes && <span className="node-core"></span>}
              </motion.div>
            ))}
          </div>
          <p className="nodes-subtext">
            {nodes === 5 ? "Curriculum synthesis complete." : "Ingesting verified semantic clusters..."}
          </p>
        </div>
      </div>
    </div>
  );
}
