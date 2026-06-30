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

    async def run(self, topic: str, level: str, sources: List[str], extracted_callback=None) -> List[Dict[str, Any]]:
        """
        The main pipeline. Processes all user-provided sources. 
        If the level is advanced, automatically supplements with Arxiv.
        
        Returns:
            A list of structured dictionary chunks mapping the source metadata to its extracted markdown content.
        """
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
                    if extracted_callback: extracted_callback(source)
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
        MAX_ITERATIONS = 5 # Safety limit to prevent infinite loops
        iteration = 0
        
        while iteration < MAX_ITERATIONS:
            current_knowledge_text = "\n\n".join([item["content"] for item in extracted_knowledge if item["status"] == "passed"])
            
            needs_supplementation = False
            queries_to_run = []
            
            if len([k for k in extracted_knowledge if k["status"] == "passed"]) == 0:
                needs_supplementation = True
                queries_to_run = [f"{topic} {level} tutorial concept guide"]
                print(f"\n[Iteration {iteration+1}] No knowledge yet. Starting autonomous search...")
            else:
                print(f"\n[Iteration {iteration+1}] Evaluating if current knowledge base is sufficient for {level} level...")
                eval_result = await asyncio.to_thread(self.research_agent.evaluate_knowledge_sufficiency, current_knowledge_text, topic, level)
                
                if eval_result.get("is_sufficient", True):
                    print(f"✅ AI determined the knowledge base is now SUFFICIENT for '{topic}' at the {level} level!")
                    break # We have enough!
                    
                needs_supplementation = True
                queries_to_run = eval_result.get("queries", [f"{topic} {level} advanced concepts"])
                print(f"⚠️ Knowledge still insufficient. AI generated new targeted queries to fill gaps: {queries_to_run}")

            if needs_supplementation:
                found_urls = []
                for query in queries_to_run:
                    urls = await asyncio.to_thread(self.research_agent.search_web, query)
                    for u in urls:
                        norm_u = self._normalize_url(u)
                        if norm_u not in found_urls and not any(self._normalize_url(k.get("url", "")) == norm_u for k in extracted_knowledge):
                            found_urls.append(norm_u)
                
                if not found_urls:
                    print("Could not find any new URLs to scrape. Ending search.")
                    break
                    
                print(f"Found {len(found_urls)} new potential sources. Scraping...")
                scraped_in_iteration = 0
                
                # Scrape up to 2 high-quality sources per iteration, then pause to re-evaluate the whole base
                for url in found_urls:
                    # original URL could have query params stripped in normalization, so it's safer to scrape the original URL or normalized?
                    # The normalized url is safe for most.
                    status = "failed"
                    content = ""
                    try:
                        content = await self.web_scraper.scrape_url(url)
                        # Agent-sourced links DO go through the strict quality gate
                        is_valid = await asyncio.to_thread(self.research_agent.evaluate_source_quality, content, topic, level)
                        if is_valid:
                            status = "passed"
                            print(f"🟢 Source {url} PASSED quality gate.")
                            if extracted_callback: extracted_callback(url)
                            scraped_in_iteration += 1
                        else:
                            print(f"🔴 Source {url} FAILED quality gate. Discarding.")
                            status = "failed"
                    except Exception as e:
                        print(f"ERROR: Failed to scrape {url}. Error: {e}")
                        
                    extracted_knowledge.append({
                        "source_id": str(uuid.uuid4()),
                        "url": url,
                        "type": "web",
                        "title": url,
                        "status": status,
                        "origin": "autonomous",
                        "content": content
                    })
                    
                    if scraped_in_iteration >= 2:
                        break # Go back to the top of the while loop to ask the AI if this is enough now!
            
            iteration += 1
            
        if iteration >= MAX_ITERATIONS:
            print("\n[Warning] Reached maximum AI research cycles. Proceeding with gathered knowledge.")
        
        print("\n--- Knowledge Gathering Complete ---")
        return extracted_knowledge
