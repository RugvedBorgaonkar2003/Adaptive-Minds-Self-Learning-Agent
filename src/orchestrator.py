import sys
import os
import asyncio
import uuid
import urllib.parse
from typing import List, Dict, Optional, Any

# Ensure project root is in path for direct execution
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our individual extractors
from .scraper import WebScraper, ResearchAgent
from .pdf_parser import PDFParser
from .arxiv_searcher import ArxivSearcher

class KnowledgeOrchestrator:
    """
    The central brain for gathering knowledge.
    Takes the output of the Onboarding Agent (topic, level, sources)
    and flawlessly delegates scraping/parsing without crashing.
    """
    def __init__(self):
        # Initialize our underlying tools
        self.web_scraper = WebScraper()
        self.pdf_parser = PDFParser()
        self.arxiv_searcher = ArxivSearcher()
        self.research_agent = ResearchAgent()

    def _normalize_url(self, url: str) -> str:
        """Normalizes URL for accurate duplicate checking."""
        parsed = urllib.parse.urlparse(url.lower())
        netloc = parsed.netloc.replace('www.', '')
        path = parsed.path.rstrip('/')
        return f"{parsed.scheme}://{netloc}{path}"

    def _categorize_source(self, source: str) -> str:
        """Helper to determine what kind of source we are looking at."""
        source_lower = source.lower()
        if source_lower.endswith('.pdf') and os.path.exists(source) and not source_lower.startswith('http'):
            return "local_pdf"
        elif "youtube.com" in source_lower or "youtu.be" in source_lower:
            return "youtube"
        elif source_lower.startswith('http') or source_lower.startswith('www.'):
            return "web"
        else:
            # Fallback for unrecognized things, though we could try to treat them as web searches
            return "web"

    async def run(self, topic: str, level: str, reason: str = "Deep Conceptual Understanding", sources: List[str] = None, extracted_callback=None) -> List[Dict[str, Any]]:
        """
        The main pipeline. Processes all user-provided sources. 
        If the level is advanced, automatically supplements with Arxiv.
        
        Returns:
            A list of structured dictionary chunks mapping the source metadata to its extracted markdown content.
        """
        if sources is None:
            sources = []

        extracted_knowledge = []

        print(f"\n--- Orchestrating Knowledge Gathering for: '{topic}' [{level}] ---")

        # 1. Process User Provided Sources
        for source in sources:
            source_type = self._categorize_source(source)
            status = "failed"
            content = ""
            try:
                if source_type == "youtube":
                    content = await asyncio.to_thread(self.web_scraper.get_youtube_transcript, source)
                    status = "passed"
                    if extracted_callback: extracted_callback(source)
                elif source_type == "web":
                    content = await self.web_scraper.scrape_url(source)
                    status = "passed"
                    if extracted_callback: extracted_callback(source, passed=True)
                elif source_type == "local_pdf":
                    if "advanced" not in level.lower():
                        print(f"Warning: PDF sources are only permitted in the 'advanced' level. Skipping {source}.")
                    elif os.path.exists(source):
                        content = await asyncio.to_thread(self.pdf_parser.parse_pdf, source)
                        status = "passed"
                        if extracted_callback: extracted_callback(source)
                    else:
                        print(f"Warning: PDF source not found on disk at {source}")
                else:
                    print(f"Warning: Unrecognized source format '{source}'. Skipping.")
            except Exception as e:
                print(f"ERROR: Failed to process source '{source}'. Skipping to prevent crash. Error: {e}")
                if extracted_callback: extracted_callback(source, passed=False)

            extracted_knowledge.append({
                "source_id": str(uuid.uuid4()),
                "url": source,
                "type": source_type,
                "title": source,
                "status": status,
                "origin": "user",
                "content": content
            })

        # 2. Autonomous Supplementation (if advanced)
        # We check both exact casing and lowercase variations of the level text
        if "advanced" in level.lower():
            print(f"\n[Advanced Level Detected] Automatically pulling supplementary peer-reviewed papers for '{topic}'...")
            
            # Fetch the top 2 highly relevant papers
            try:
                downloaded_papers = await asyncio.to_thread(self.arxiv_searcher.search_and_download, topic, 2)
            except Exception as e:
                print(f"Warning: Failed to fetch Arxiv papers for '{topic}'. Error: {e}")
                downloaded_papers = []
            
            # We must process these newly downloaded PDFs
            for paper_meta in downloaded_papers:
                pdf_path = paper_meta["local_path"]
                status = "failed"
                content = ""
                if os.path.exists(pdf_path):
                    try:
                        raw_content = await asyncio.to_thread(self.pdf_parser.parse_pdf, pdf_path)
                        # We prepend the metadata to the markdown so the LLM has context
                        content = (
                            f"# Title: {paper_meta['title']}\n"
                            f"**Authors:** {', '.join(paper_meta['authors'])}\n"
                            f"**Summary:** {paper_meta['summary']}\n\n"
                            f"## Paper Content\n"
                            f"{raw_content}"
                        )
                        status = "passed"
                        if extracted_callback: extracted_callback(paper_meta.get("pdf_url", pdf_path))
                    except Exception as e:
                        print(f"Warning: Failed to parse downloaded Arxiv PDF '{pdf_path}'. Error: {e}")
                else:
                    print(f"Warning: Downloaded arxiv paper not found at {pdf_path}")
                
                extracted_knowledge.append({
                    "source_id": str(uuid.uuid4()),
                    "url": paper_meta.get("pdf_url", pdf_path),
                    "type": "arxiv",
                    "title": paper_meta['title'],
                    "status": status,
                    "origin": "autonomous",
                    "content": content
                })

        # 3. Dynamic Autonomous Web Supplementation
        # Set dynamic accepted source goal based on chosen level
        level_lower = level.lower()
        if "beginner" in level_lower:
            TARGET_ACCEPTED = 7
        elif "intermediate" in level_lower:
            TARGET_ACCEPTED = 11
        else: # advanced
            TARGET_ACCEPTED = 16

        # Set up search queries list (deterministic, no LLM queries, with research papers for advanced)
        if "advanced" in level_lower:
            queries_to_run = [
                f"{topic} {level} {reason} research papers",
                f"{topic}",
                f"{topic} {level}",
                f"{topic} {reason}",
                f"{topic} research papers"
            ]
        else:
            queries_to_run = [
                f"{topic} {level} level for {reason}",
                f"{topic}",
                f"{topic} {level}",
                f"{topic} {reason}"
            ]

        # Track which domains have already been scraped so we never hit the same site twice
        seen_domains = set()
        for k in extracted_knowledge:
            if k["status"] == "passed":
                try:
                    from urllib.parse import urlparse
                    seen_domains.add(urlparse(k["url"]).netloc.replace("www.", ""))
                except Exception:
                    pass

        # Execute searches sequentially
        for query in queries_to_run:
            accepted_so_far = sum(1 for k in extracted_knowledge if k["status"] == "passed")
            if accepted_so_far >= TARGET_ACCEPTED:
                print(f"\n✅ Reached target of {TARGET_ACCEPTED} accepted sources. Stopping search.")
                break

            print(f"\n[Search] Executing query: '{query}'...")
            candidate_urls = []
            try:
                candidate_urls = await asyncio.to_thread(self.research_agent.search_web, query)
            except Exception as e:
                print(f"⚠️ Error searching web for query '{query}': {e}. Trying next subquery.")
                continue

            if not candidate_urls:
                print(f"⚠️ No results returned for query '{query}'. Trying next subquery.")
                continue

            # Limit per query dynamically to ensure diverse sources but still hit target
            URLS_PER_QUERY = max(4, int((TARGET_ACCEPTED * 2.5) / len(queries_to_run)))
            valid_candidates = []
            for u in candidate_urls:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(u).netloc.replace("www.", "")
                except Exception:
                    domain = u
                norm_u = self._normalize_url(u)
                already_scraped = any(
                    self._normalize_url(k.get("url", "")) == norm_u
                    for k in extracted_knowledge
                )
                # Domain-level dedup
                if domain not in seen_domains and not already_scraped:
                    valid_candidates.append(u)

            print(f"Found {len(valid_candidates)} candidate URLs from fresh domains. Scraping up to {URLS_PER_QUERY}…")

            # Scrape and evaluate
            for url in valid_candidates[:URLS_PER_QUERY]:
                if accepted_so_far >= TARGET_ACCEPTED:
                    break

                try:
                    from urllib.parse import urlparse
                    domain = urlparse(url).netloc.replace("www.", "")
                except Exception:
                    domain = url

                seen_domains.add(domain)   # mark domain as visited regardless of outcome
                status  = "failed"
                content = ""
                print(f"Scraping candidate: {url}")
                try:
                    content = await self.web_scraper.scrape_url(url)
                    if content and len(content) >= 500:
                        is_valid = await asyncio.to_thread(
                            self.research_agent.evaluate_source_quality, content, topic, level
                        )
                        if is_valid:
                            status = "passed"
                            accepted_so_far += 1
                            print(f"🟢 {url} — ACCEPTED ({accepted_so_far}/{TARGET_ACCEPTED})")
                            if extracted_callback: extracted_callback(url, passed=True)
                        else:
                            print(f"🔴 {url} — REJECTED by quality gate")
                            if extracted_callback: extracted_callback(url, passed=False)
                    else:
                        print(f"🔴 {url} — REJECTED (too short or empty)")
                        if extracted_callback: extracted_callback(url, passed=False)
                except Exception as e:
                    print(f"⚠️ Error scraping/processing source {url}: {e}. Continuing.")
                    if extracted_callback: extracted_callback(url, passed=False)

                extracted_knowledge.append({
                    "source_id": str(uuid.uuid4()),
                    "url":        url,
                    "type":       "web",
                    "title":      url,
                    "status":     status,
                    "origin":     "autonomous",
                    "content":    content,
                })

        print("\n--- Knowledge Gathering Complete ---")
        return extracted_knowledge
