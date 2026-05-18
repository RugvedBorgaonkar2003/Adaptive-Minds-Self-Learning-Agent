import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function formatTimestamp(ts) {
  if (!ts) return '';
  // ISO format: 2026-05-15T22:10:00
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

function ScoreRing({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? '#a3ad9e' : pct >= 60 ? '#c4a96d' : '#c47a6d';
  return (
    <div className="rpt-ring-wrap">
      <svg viewBox="0 0 36 36" className="rpt-ring-svg">
        <path className="rpt-ring-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path className="rpt-ring-fill"
          strokeDasharray={`${pct}, 100`}
          stroke={color}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <div className="rpt-ring-pct" style={{ color }}>{pct}<span>%</span></div>
    </div>
  );
}

function MasteryBar({ concept, value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? 'var(--color-moss)' : pct >= 60 ? '#c4a96d' : '#c47a6d';
  return (
    <div className="rpt-mastery-bar">
      <div className="rpt-mastery-label">
        <span>{concept}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="rpt-bar-track">
        <motion.div
          className="rpt-bar-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function ReportDocument({ entry }) {
  const r = entry.report;
  const meta = r.metadata || {};
  const perf = r.performance || {};
  const h3 = r.honest_three || {};
  const dive = r.deep_dive || {};
  const journey = r.journey || {};

  const handleDownloadPDF = () => {
    const conceptMastery = dive.concept_mastery || {};
    const masteryRows = Object.entries(conceptMastery)
      .map(([k, v]) => `<tr><td>${k}</td><td><strong>${v}%</strong></td></tr>`).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>Report — ${meta.module_title || 'Module'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Crimson+Pro:wght@400;600&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a2e;
                 padding: 50px 60px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
          .brand { font-size: 11px; letter-spacing: 0.15em; color: #9999bb;
                   text-transform: uppercase; margin-bottom: 32px;
                   border-bottom: 1px solid #e0e0f0; padding-bottom: 12px; }
          h1 { font-family: 'Crimson Pro', serif; font-size: 2rem; color: #1a1a2e; margin-bottom: 4px; }
          .meta { font-size: 0.85rem; color: #8888aa; margin-bottom: 32px; }
          h2 { font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase;
               color: #5a6fa8; font-weight: 700; margin: 28px 0 12px;
               border-left: 3px solid #5a6fa8; padding-left: 10px; }
          .score-box { display: inline-block; font-size: 3rem; font-family: 'Crimson Pro', serif;
                       color: #2d2d5e; font-weight: 600; margin-bottom: 8px; }
          .score-sub { font-size: 0.9rem; color: #8888aa; margin-bottom: 20px; }
          .feedback-block { background: #f7f7ff; border-radius: 8px; padding: 16px 20px;
                            margin-bottom: 14px; border-left: 3px solid #5a6fa8; }
          .feedback-block .label { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase;
                                    color: #7777aa; font-weight: 700; margin-bottom: 6px; }
          .feedback-block p { font-size: 0.95rem; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 0.95rem; color: #333; }
          td:last-child { text-align: right; }
          .style-text { font-size: 0.95rem; color: #444; line-height: 1.7; }
          .prereq-box { background: #f0fff4; border-radius: 8px; padding: 14px 18px;
                        border-left: 3px solid #4a9a6d; margin-top: 10px; font-size: 0.95rem; color: #333; }
          .prereq-box.review { background: #fff8f0; border-left-color: #c4a96d; }
          @media print { body { padding: 30px 40px; } }
        </style>
      </head>
      <body>
        <div class="brand">ADAPTIVE MINDS — Module Mastery Report</div>
        <h1>${meta.module_title || 'Module Report'}</h1>
        <div class="meta">
          ${meta.curriculum_topic ? `Course: ${meta.curriculum_topic} &nbsp;·&nbsp; ` : ''}
          Module ${meta.module_number || ''} &nbsp;·&nbsp;
          Generated: ${formatTimestamp(meta.timestamp)}
        </div>

        <h2>Test Score</h2>
        <div class="score-box">${perf.score ?? '—'}%</div>
        <div class="score-sub">
          ${perf.failed_attempts > 0 ? `Passed after ${perf.failed_attempts} failed attempt(s)` : 'Passed on first attempt'}
          &nbsp;·&nbsp; ${perf.concepts_count || 0} concepts covered
        </div>

        <h2>Personalised Feedback</h2>
        <div class="feedback-block">
          <div class="label">✅ Strength</div>
          <p>${h3.strength || '—'}</p>
        </div>
        <div class="feedback-block">
          <div class="label">⚠ Struggled With</div>
          <p>${h3.struggled || '—'}</p>
        </div>
        <div class="feedback-block">
          <div class="label">🎯 Action Item</div>
          <p>${h3.action || '—'}</p>
        </div>

        <h2>Concept Mastery</h2>
        <table>${masteryRows}</table>

        <h2>Learning Style</h2>
        <p class="style-text">${dive.learning_style_text || '—'}</p>

        ${journey.prereq_note ? `
        <h2>Readiness for Next Module</h2>
        <div class="prereq-box ${journey.prereq_status === 'review' ? 'review' : ''}">
          ${journey.prereq_note}
        </div>` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const conceptMastery = dive.concept_mastery || {};
  const prereqReady = journey.prereq_status !== 'review';

  return (
    <div className="rpt-document">
      {/* ── Header ── */}
      <div className="rpt-doc-brand">ADAPTIVE MINDS — Module Mastery Report</div>
      <div className="rpt-doc-title">{meta.module_title || 'Module Report'}</div>
      <div className="rpt-doc-meta">
        {meta.curriculum_topic && <span>{meta.curriculum_topic} · </span>}
        <span>Module {meta.module_number}</span>
        <span className="rpt-dot">·</span>
        <span>{formatTimestamp(meta.timestamp)}</span>
      </div>

      <div className="rpt-divider" />

      {/* ── Score ── */}
      <div className="rpt-section-label">Test Score</div>
      <div className="rpt-score-row">
        <ScoreRing score={perf.score ?? 0} />
        <div className="rpt-score-info">
          <div className="rpt-score-big">{perf.score ?? '—'}<span className="rpt-score-unit">/ 100</span></div>
          <div className="rpt-score-sub">
            {perf.failed_attempts > 0
              ? `Passed after ${perf.failed_attempts} failed attempt(s)`
              : 'Passed on first attempt'}
          </div>
          <div className="rpt-score-sub">{perf.concepts_count || 0} concepts covered in this module</div>
        </div>
      </div>

      <div className="rpt-divider" />

      {/* ── Personalised Feedback (no Activity Log) ── */}
      <div className="rpt-section-label">Personalised Feedback</div>
      <div className="rpt-feedback-grid">
        <div className="rpt-feedback-card strength">
          <div className="rpt-fb-tag">✅ Strength</div>
          <p>{h3.strength || '—'}</p>
        </div>
        <div className="rpt-feedback-card struggled">
          <div className="rpt-fb-tag">⚠ Struggled With</div>
          <p>{h3.struggled || '—'}</p>
        </div>
        <div className="rpt-feedback-card action">
          <div className="rpt-fb-tag">🎯 Action Item</div>
          <p>{h3.action || '—'}</p>
        </div>
      </div>

      <div className="rpt-divider" />

      {/* ── Concept Mastery ── */}
      {Object.keys(conceptMastery).length > 0 && (
        <>
          <div className="rpt-section-label">Concept Mastery Breakdown</div>
          <div className="rpt-mastery-list">
            {Object.entries(conceptMastery).map(([concept, val], i) => (
              <motion.div
                key={concept}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <MasteryBar concept={concept} value={val} />
              </motion.div>
            ))}
          </div>
          <div className="rpt-divider" />
        </>
      )}

      {/* ── Learning Style ── */}
      {dive.learning_style_text && (
        <>
          <div className="rpt-section-label">Your Learning Profile</div>
          <div className="rpt-style-tags">
            {(dive.learning_style_tags || []).map(tag => (
              <span key={tag} className="rpt-tag">{tag}</span>
            ))}
          </div>
          <p className="rpt-style-text">{dive.learning_style_text}</p>
          <div className="rpt-divider" />
        </>
      )}

      {/* ── Journey Stats ── */}
      <div className="rpt-section-label">Course Journey</div>
      <div className="rpt-journey-grid">
        <div className="rpt-journey-stat">
          <div className="rpt-journey-val">{journey.completion_pct ?? 0}%</div>
          <div className="rpt-journey-key">Course Complete</div>
        </div>
        <div className="rpt-journey-stat">
          <div className="rpt-journey-val">{journey.total_modules_done ?? 0}<span>/{journey.total_in_course ?? '?'}</span></div>
          <div className="rpt-journey-key">Modules Done</div>
        </div>
        <div className="rpt-journey-stat">
          <div className="rpt-journey-val">{journey.avg_mastery ?? 0}%</div>
          <div className="rpt-journey-key">Avg Mastery</div>
        </div>
        <div className="rpt-journey-stat">
          <div className="rpt-journey-val">{journey.streak ?? 0}</div>
          <div className="rpt-journey-key">Day Streak</div>
        </div>
      </div>

      {/* ── Next Module Readiness ── */}
      {journey.prereq_note && (
        <>
          <div className="rpt-divider" />
          <div className="rpt-section-label">Readiness for Next Module</div>
          {journey.next_module_title && (
            <div className="rpt-next-module">
              <span className="rpt-next-label">Up Next:</span> {journey.next_module_title}
            </div>
          )}
          <div className={`rpt-prereq-box ${prereqReady ? 'ready' : 'review'}`}>
            {prereqReady ? '✅' : '⚠'} {journey.prereq_note}
          </div>
        </>
      )}

      {/* ── Download ── */}
      <div className="rpt-download-row">
        <button className="rpt-download-btn" onClick={handleDownloadPDF}>
          ⬇ Download PDF Report
        </button>
      </div>
    </div>
  );
}

export default function ReportsView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/reports/all`, {
        headers: { 'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || '' }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setReports(data.reports);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Empty state ──
  if (!loading && reports.length === 0) {
    return (
      <div className="reports-view">
        <div className="view-header">
          <div>
            <h2>Mastery Reports</h2>
            <p>Auto-generated after each completed module.</p>
          </div>
        </div>
        <div className="rpt-empty-state">
          <div className="rpt-empty-icon">📊</div>
          <h3>No Reports Yet</h3>
          <p>Complete a module and pass its end-of-module test to automatically generate your personalised performance report here.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reports-view">
        <div className="view-header">
          <div><h2>Mastery Reports</h2><p>Loading...</p></div>
        </div>
        <div className="rpt-empty-state">
          <div className="rpt-loading-pulse">⟳</div>
          <p>Loading your reports...</p>
        </div>
      </div>
    );
  }

  const selected = reports[selectedIdx];

  return (
    <div className="reports-view">
      <div className="view-header">
        <div>
          <h2>Mastery Reports</h2>
          <p>{reports.length} module{reports.length !== 1 ? 's' : ''} completed</p>
        </div>
      </div>

      <div className="rpt-layout">
        {/* Left panel: report list */}
        <div className="rpt-list-panel">
          {reports.map((entry, idx) => {
            const meta = entry.report?.metadata || {};
            const score = entry.report?.performance?.score ?? '—';
            return (
              <motion.div
                key={entry.filename}
                className={`rpt-list-item ${idx === selectedIdx ? 'active' : ''}`}
                onClick={() => setSelectedIdx(idx)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <div className="rpt-list-score" style={{
                  color: score >= 80 ? '#a3ad9e' : score >= 60 ? '#c4a96d' : '#c47a6d'
                }}>{score}%</div>
                <div className="rpt-list-text">
                  <span className="rpt-list-title">
                    {meta.module_title || entry.filename.replace('.json', '').replace(/_/g, ' ')}
                  </span>
                  <span className="rpt-list-date">{formatTimestamp(meta.timestamp)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right panel: scrollable report document */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.filename}
              className="rpt-document-wrap"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <ReportDocument entry={selected} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
