import os
import asyncio
from typing import List, Dict, Optional

# Import our individual extractors
from src.scraper import WebScraper
from src.pdf_parser import PDFParser
from src.arxiv_searcher import ArxivSearcher

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

    def _categorize_source(self, source: str) -> str:
        """Helper to determine what kind of source we are looking at."""
        source_lower = source.lower()
        if (source_lower.endswith('.pdf') or os.path.exists(source)) and not source_lower.startswith('http'):
            return "local_pdf"
        elif "youtube.com" in source_lower or "youtu.be" in source_lower:
            return "youtube"
        elif source_lower.startswith('http') or source_lower.startswith('www.'):
            return "web"
        else:
            # Fallback for unrecognized things, though we could try to treat them as web searches
            return "web"

    async def process_learning_request(self, topic: str, level: str, sources: List[str]) -> Dict[str, str]:
        """
        The main pipeline. Processes all user-provided sources. 
        If the level is advanced, automatically supplements with Arxiv.
        
        Returns:
            A dictionary mapping the source identifier (URL/filename) to its extracted markdown content.
        """
        extracted_knowledge = {}

        print(f"\n--- Orchestrating Knowledge Gathering for: '{topic}' [{level}] ---")

        # 1. Process User Provided Sources
        for source in sources:
            source_type = self._categorize_source(source)
            try:
                if source_type == "youtube":
                    content = self.web_scraper.get_youtube_transcript(source)
                    extracted_knowledge[source] = content
                    
                elif source_type == "web":
                    content = await self.web_scraper.scrape_url(source)
                    extracted_knowledge[source] = content
                        
                elif source_type == "local_pdf":
                    if os.path.exists(source):
                        content = self.pdf_parser.parse_pdf(source)
                        extracted_knowledge[source] = content
                    else:
                        print(f"Warning: PDF source not found on disk at {source}")
                else:
                    print(f"Warning: Unrecognized source format '{source}'. Skipping.")
            except Exception as e:
                print(f"ERROR: Failed to process source '{source}'. Skipping to prevent crash. Error: {e}")

        # 2. Autonomous Supplementation (if advanced)
        # We check both exact casing and lowercase variations of the level text
        if "advanced" in level.lower():
            print(f"\n[Advanced Level Detected] Automatically pulling supplementary peer-reviewed papers for '{topic}'...")
            
            # Fetch the top 2 highly relevant papers
            downloaded_papers = self.arxiv_searcher.search_and_download(topic=topic, max_results=2)
            
            # We must process these newly downloaded PDFs
            for paper_meta in downloaded_papers:
                pdf_path = paper_meta["local_path"]
                if os.path.exists(pdf_path):
                    content = self.pdf_parser.parse_pdf(pdf_path)
                    # We store it using the arxiv url or title as the key
                    key = f"arxiv_{paper_meta['title']}"
                    
                    # We prepend the metadata to the markdown so the LLM has context
                    formatted_content = (
                        f"# Title: {paper_meta['title']}\n"
                        f"**Authors:** {', '.join(paper_meta['authors'])}\n"
                        f"**Summary:** {paper_meta['summary']}\n\n"
                        f"## Paper Content\n"
                        f"{content}"
                    )
                    extracted_knowledge[key] = formatted_content
                else:
                    print(f"Warning: Downloaded arxiv paper not found at {pdf_path}")
        
        print("\n--- Knowledge Gathering Complete ---")
        return extracted_knowledge

# Example usage (for testing)
if __name__ == "__main__":
    async def run_test():
        orchestrator = KnowledgeOrchestrator()
        
        # Simulate an onboarding state
        topic = "Proximal Policy Optimization"
        level = "advanced"
        user_sources = [
            "https://www.youtube.com/watch?v=5P7I-xPq8u8", # A known PPO explanation video
            # Note: you would add local path to a PDF here if you had one for testing
        ]
        
        results = await orchestrator.process_learning_request(topic, level, user_sources)
        
        for source, content in results.items():
            print(f"\nSource Key: {source}")
            # Print just the first 300 characters to verify it worked without flooding terminal
            print(f"Extracted Length: {len(content)} characters. Preview: {content[:300]}...\n")

    asyncio.run(run_test())
