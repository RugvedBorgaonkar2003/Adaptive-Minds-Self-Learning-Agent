import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Converts a markdown string to styled HTML for the PDF-style view.
// Handles: headings (#, ##, ###), bold (**), italic (*), inline code, bullet lists, hr.
function renderMarkdown(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<hr class="note-hr" />';
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 class="note-h3">${inline(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2 class="note-h2">${inline(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1 class="note-h1">${inline(line.slice(2))}</h1>`;
      continue;
    }

    // Bullet points
    if (/^[-*] /.test(line)) {
      if (!inList) { html += '<ul class="note-list">'; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
      continue;
    }

    // Close list on blank or non-list line
    if (inList && line.trim() !== '') {
      html += '</ul>';
      inList = false;
    }

    // Blank line → paragraph break
    if (line.trim() === '') {
      if (!inList) html += '<div class="note-spacer"></div>';
      continue;
    }

    html += `<p class="note-p">${inline(line)}</p>`;
  }

  if (inList) html += '</ul>';
  return html;
}

function inline(text) {
  // Bold+italic: ***text***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code class="note-code">$1</code>');
  return text;
}

function formatTimestamp(ts) {
  if (!ts || ts.length < 13) return '';
  // Format: YYYYMMDD_HHMM  →  DD MMM YYYY, HH:MM
  const y = ts.slice(0, 4);
  const mo = ts.slice(4, 6);
  const d = ts.slice(6, 8);
  const h = ts.slice(9, 11);
  const mi = ts.slice(11, 13);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(mo,10)-1]} ${y}, ${h}:${mi}`;
}

export default function NotesView() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/notes/all`, {
        headers: { 'X-Groq-Api-Key': localStorage.getItem('groqApiKey') || '' }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotes(data.notes);
        if (data.notes.length > 0) setSelectedNote(data.notes[0]);
      }
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedNote) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>${selectedNote.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: #fff;
            color: #1a1a2e;
            padding: 60px;
            max-width: 860px;
            margin: 0 auto;
            line-height: 1.7;
          }
          .pdf-brand {
            font-family: 'Inter', sans-serif;
            font-size: 11px;
            letter-spacing: 0.15em;
            color: #7a7a9d;
            text-transform: uppercase;
            margin-bottom: 40px;
            border-bottom: 1px solid #e0e0f0;
            padding-bottom: 12px;
          }
          h1 { font-family: 'Crimson Pro', serif; font-size: 2.2rem; color: #1a1a2e; font-weight: 600; margin-bottom: 6px; }
          h2 { font-size: 1.3rem; color: #2d2d5e; font-weight: 700; margin: 28px 0 10px; border-left: 3px solid #5a6fa8; padding-left: 10px; }
          h3 { font-size: 1.1rem; color: #3d3d6b; font-weight: 600; margin: 20px 0 8px; }
          p { color: #333; font-size: 1rem; margin-bottom: 10px; }
          ul { padding-left: 24px; margin-bottom: 12px; }
          li { margin-bottom: 6px; color: #333; }
          strong { font-weight: 700; color: #1a1a2e; }
          em { font-style: italic; color: #555; }
          code { background: #f0f0f8; color: #4a4a9d; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
          hr { border: none; border-top: 1px solid #e0e0f0; margin: 24px 0; }
          .note-timestamp { font-size: 0.85rem; color: #9999bb; margin-bottom: 32px; }
          @media print { body { padding: 40px; } }
        </style>
      </head>
      <body>
        <div class="pdf-brand">ADAPTIVE MINDS — Chapter Notes</div>
        <h1>${selectedNote.title}</h1>
        <div class="note-timestamp">Generated: ${formatTimestamp(selectedNote.timestamp)}</div>
        ${renderMarkdown(selectedNote.content)}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // ── Empty state ──
  if (!loading && notes.length === 0) {
    return (
      <div className="notes-view">
        <div className="view-header">
          <div>
            <h2>Chapter Notes</h2>
            <p>Auto-generated after each completed module.</p>
          </div>
        </div>
        <div className="notes-empty-state">
          <div className="notes-empty-icon">📄</div>
          <h3>No Notes Yet</h3>
          <p>Complete a module and pass its test to automatically generate your personalized chapter notes here.</p>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="notes-view">
        <div className="view-header">
          <div>
            <h2>Chapter Notes</h2>
            <p>Auto-generated after each completed module.</p>
          </div>
        </div>
        <div className="notes-empty-state">
          <div className="notes-loading-pulse">⟳</div>
          <p>Loading your notes...</p>
        </div>
      </div>
    );
  }

  // ── Main notes view ──
  return (
    <div className="notes-view">
      <div className="view-header">
        <div>
          <h2>Chapter Notes</h2>
          <p>{notes.length} module{notes.length !== 1 ? 's' : ''} completed</p>
        </div>
        {selectedNote && (
          <button className="notes-download-btn" onClick={handleDownloadPDF}>
            ⬇ Download PDF
          </button>
        )}
      </div>

      <div className="notes-layout">
        {/* Left: notes list */}
        <div className="notes-list-panel">
          {notes.map((note, idx) => (
            <motion.div
              key={note.filename}
              className={`notes-list-item ${selectedNote?.filename === note.filename ? 'active' : ''}`}
              onClick={() => setSelectedNote(note)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
            >
              <div className="notes-list-dot" />
              <div className="notes-list-text">
                <span className="notes-list-title">{note.title.replace(' — Chapter Notes', '')}</span>
                <span className="notes-list-date">{formatTimestamp(note.timestamp)}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right: PDF-style document viewer */}
        <AnimatePresence mode="wait">
          {selectedNote && (
            <motion.div
              key={selectedNote.filename}
              className="notes-document"
              ref={printRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="notes-doc-brand">ADAPTIVE MINDS — Chapter Notes</div>
              <div className="notes-doc-timestamp">Generated: {formatTimestamp(selectedNote.timestamp)}</div>
              <div
                className="notes-doc-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
