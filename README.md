# 🧠 Adaptive Minds: Self-Learning AI Agent

An advanced, self-learning AI tutor that dynamically generates personalized curriculums, fetches external knowledge, and tutors users in real-time. Built with a FastAPI backend, vector databases, and LangGraph, Adaptive Minds transforms a simple topic into a comprehensive interactive course. 

Designed originally as a college project, this application has evolved into a fully-fledged backend system robust enough for production and real-world teaching dynamically. 

---

## ✨ Key Features

- **Automated Curriculum Generation**: Input a topic and learning goal, and the AI builds a structured, step-by-step curriculum and concept tree.
- **Dynamic Knowledge Acquisition**: Automatically scrapes, parses, and curates knowledge from PDFs, research papers (ArXiv), and the web.
- **Real-Time Contextual AI Tutor**: Powered by LangGraph, a state-based conversational engine that acts as a tutor, evaluating student mastery on each concept.
- **Retrieval-Augmented Generation (RAG)**: Chunks, embeds, and retrieves documents seamlessly using ChromaDB vector storage (session-isolated).
- **Mastery Reporting & Flashcards**: Generates automated PDF mastery reports upon module completion and creates on-demand study flashcards.
- **Robust Asynchronous API**: Utilizes FastAPI for high-performance, non-blocking asynchronous onboarding and chatting operations.

---

## 🏗️ Architecture & Tech Stack

- **Framework**: `FastAPI` (Python)
- **AI Agent & Workflow**: `LangChain`, `LangGraph`
- **Vector Database**: `ChromaDB`
- **Asynchronous Processing**: Native `asyncio`, FastAPI `BackgroundTasks`
- **Data Gathering**: Bespoke Web Scrapers, ArXiv API Integration, PDF Parsers

### Backend API Endpoints overview:
- `POST /onboarding` - Hands-off async workflow initialization for curriculum assembly.
- `GET /onboarding/status/{session_id}` - Polling endpoint for complex generation states.
- `POST /chat/{session_id}` - Conversational entrypoint for the AI tutor utilizing stateful checkpointers.
- `POST /flashcards` - On-demand artifact generation.
- `GET /reports/{session_id}/{module_id}` - Secure retrieval of generated PDF learning reports.

---

## 🔄 Workflow Pipeline

### Phase 1: Onboarding & Knowledge Acquisition
1. The user defines a *Topic*, *Level*, and *Goal*.
2. The **Knowledge Orchestrator** fetches information from provided sources, research databases, and verified websites.
3. Content goes through a rigorous AI quality check. Rejected content is filtered out, leaving a verified base.

### Phase 2: Processing & Structuring 
1. The **Document Processor** chunks down the verified knowledge base into manageable tokens.
2. These embeddings are securely saved into a session-isolated **Vector Database**.
3. A **Curriculum Generator** utilizes this database to plot out sequential chapters (modules) and concepts, providing a clear educational roadmap.

### Phase 3: The AI Tutor Engine
1. Control is handed over to the **LangGraph Tutor Orchestrator**. 
2. The tutor explains concepts one by one. It quizzes the student and listens to responses, evaluating their conceptual understanding.
3. Upon successfully completing a module, the system generates automated course notes and an elegant PDF Mastery Report. If the user struggles, the agent dynamically adjusts its approach.

---

## 🚀 Installation & Local Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RugvedBorgaonkar2003/Adaptive-Minds-Self-Learning-Agent.git
   cd Adaptive-Minds-Self-Learning-Agent
   ```

2. **Set up the virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install Dependencies:**
   Make sure you have all required Python tools installed.
   ```bash
   pip install -r pyproject.toml # or use pip/uv for package installation
   ```

4. **Environment Variables:**
   Create a `.env` file in the root directory and populate your API credentials:
   ```env
   OPENAI_API_KEY=your_openai_key
   # Add other required API keys as referenced in the codebase
   ```

5. **Run the Application Locally (Terminal Base):**
   ```bash
   python main.py
   ```

6. **Serve the API (FastAPI Backend):**
   ```bash
   uvicorn src.api.routes:router --host 0.0.0.0 --port 8000 --reload
   ```

---

## 📂 Directory Structure

```text
.
├── main.py                  # Terminal-based orchestrator entry point
├── src/
│   ├── api/
│   │   ├── routes.py        # FastAPI async endpoints logic
│   │   └── models.py        # Pydantic schemas for data validation
│   ├── scraper.py           # Web scraping engine
│   ├── pdf_parser.py        # Handles PDF ingestion
│   ├── arxiv_searcher.py    # Integrates real academic research 
│   ├── curriculum_gen.py    # Generates concept trees
│   ├── orchestrator.py      # Quality assurance for knowledge fetching
│   ├── tutor.py             # Logic for direct teaching assessment
│   ├── tutor_graph.py       # LangGraph state machine routing
│   ├── vector_db.py         # Handles embeddings and retrieval 
│   ├── report_gen.py        # Custom PDF report generation module
│   ├── flashcard_gen.py     # Independent flashcard producer
│   └── student_profile.py   # Handles multi-tenant tracking isolation
├── data/                    # Local storage for DB structures and Reports
└── ...
```

---

## 🔮 Future Scope
- **Production Redis Integration**: Swap the in-memory `SESSION_STATUS` dictionary for Redis to support massive concurrency.
- **Frontend Integration**: Hook the powerful REST APIs and LangGraph state checkpoints into a Next.js or React web interface.
- **Gamification Insights**: Track `failed_attempts` and conceptual blind-spots visually for long-term progress metrics via a dashboard.

---
*Developed with modern software architecture to transform how machines facilitate digital education.*
