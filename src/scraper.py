import os
import sys
# Ensure project root is in path for direct execution (e.g. running src/scraper.py)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import re
import json
from typing import Optional, Dict, List
from youtube_transcript_api import YouTubeTranscriptApi
from crawl4ai import AsyncWebCrawler
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_core.messages import SystemMessage, HumanMessage
import asyncio

from .llm import get_llm

class WebScraper:
    def __init__(self):
        pass

    async def scrape_url(self, url: str) -> str:
        """
        Scrapes a given URL using Crawl4AI and returns the markdown content.
        This provides clean, LLM-ready text for our knowledge base.
        """
        print(f"Scraping URL: {url}")
        try:
            async with AsyncWebCrawler(verbose=True) as crawler:
                # Option B: Manual Sniper. Explicitly remove junk elements before reading text.
                junk_tags = ['nav', 'aside', 'footer', 'header', 'iframe', '.cookie-banner', '.adsbygoogle', '#sidebar', '.sidebar']
                result = await crawler.arun(url=url, excluded_tags=junk_tags)
                # The markdown attribute contains the extracted content
                return result.markdown if result else ""
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return ""

    def _extract_youtube_video_id(self, url: str) -> Optional[str]:#output can be string or None
        """
        Extracts the video ID from a YouTube URL.
        """
        # Supports various youtube urls (youtube.com, youtu.be)
        pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
        match = re.search(pattern, url)
        if match:
            return match.group(1)
        return None

    def get_youtube_transcript(self, url: str) -> str:
        """
        Fetches the transcript for a given YouTube video URL.
        """
        video_id = self._extract_youtube_video_id(url)
        if not video_id:
            return f"Error: Could not extract video ID from URL: {url}"

        print(f"Fetching transcript for YouTube video ID: {video_id}")
        try:
            # get_transcript directly returns the list of text dictionaries (defaults to English)
            fetched_transcript = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Combine all text snippets into a single string
            full_transcript = " ".join([entry['text'] for entry in fetched_transcript])
            
            if len(full_transcript) < 500:
                print(f"YouTube transcript rejected (length: {len(full_transcript)} < 500 chars). Video is likely too short.")
                return ""
                
            return full_transcript
        except Exception as e:
            print(f"Error fetching transcript: {e}")
            return f"Error fetching transcript: {str(e)}"
            
    async def extract_source(self, url: str) -> str:
        """
        Automatically detects source type and extracts content.
        """
        if "youtube.com" in url or "youtu.be" in url:
            return self.get_youtube_transcript(url)
        else:
            return await self.scrape_url(url)

class ResearchAgent:
    def __init__(self):
        self.scraper = WebScraper()
        self.llm = get_llm()
        self.search_tool = DuckDuckGoSearchResults()
        
    def evaluate_source_quality(self, content: str, topic: str, level: str) -> bool:
        """
        Grades scraped content for relevance and substance using the LLM.
        """
        if not content or len(content) < 500:
             # Too short to be a meaningful source
             print(f"Source rejected by Layer 2 Heuristics (length: {len(content) if content else 0})")
             return False
             
        # Instead of just the first 2000 chars, take a representative sample 
        # (beginning, middle, end) to avoid failing on long introductions/sponsor pitches.
        if len(content) > 3000:
            mid = len(content) // 2
            preview = (
                content[:3000] + 
                "\n\n...[MIDDLE PORTION]...\n\n" + 
                content[mid-500:mid+500] + 
                "\n\n...[END PORTION]...\n\n" + 
                content[-3000:]
            )
        else:
            preview = content
        
        prompt = f"""You are a Curriculum Quality Gatekeeper.
Evaluate this raw web scrape for learning about: '{topic}' at a '{level}' level.

IGNORE website garbage (navigation menus, cookie banners, footers).
Grade the source from 1 to 10 on the following criteria. To pass, the overall score MUST be 7 or higher.
AUTOMATICALLY REJECT (score 1) if the page is: a course listing, a pricing/checkout page, a login wall, a search results page, or primarily an advertisement.
It must contain actual readable learning content — not just course titles or syllabi.
1. Relevance: Does it contain useful information about the topic?
2. Depth: Is it somewhat appropriate for a '{level}' level?
3. Authority: Is it educational and objective?

Return ONLY a JSON object with:
{{"score": <int>, "reason": "<short explanation>", "is_valid": <boolean true if score >= 6>}}

Text Snippet:
{preview}
"""
        try:
            response = self.llm.invoke([SystemMessage(content="You output ONLY valid JSON."), HumanMessage(content=prompt)])
            
            # Handle list content or string content
            content_str = response.content
            if isinstance(content_str, list):
                content_str = "".join([block.get("text", "") for block in content_str if isinstance(block, dict)])
            
            raw_content = str(content_str).replace("```json", "").replace("```", "").strip()
            result = json.loads(raw_content)
            
            is_valid = result.get("is_valid", False)
            print(f"Source validation for topic '{topic}': {'PASSED' if is_valid else 'FAILED'}")
            return is_valid
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "resource_exhausted" in error_str or "rate" in error_str:
                # Rate limit hit during quality check — skip this source.
                # Auto-accepting would defeat the entire purpose of the gate.
                print(f"Quality gate hit rate limit: {e}. Skipping source (not auto-accepting).")
                return False
            print(f"Quality gate error: {e}. Defaulting to discarding source to be safe.")
            return False
            
    def evaluate_knowledge_sufficiency(self, current_knowledge: str, topic: str, level: str) -> dict:
        """
        Checks if current knowledge is enough to teach the topic at the desired level.
        If not, generates search queries to find missing information.
        """
        # Extract an outline (headings) to avoid token limits
        headings = [line for line in current_knowledge.split('\n') if line.strip().startswith('#')]
        outline = "\n".join(headings)
        if len(outline) < 100:
            outline = current_knowledge[:4000] # Fallback if no markdown headings
            
        prompt = f"""You are a Curriculum Director. 
We need to teach a student about '{topic}' at a '{level}' level.
Review the outline of the knowledge we have gathered so far. 

Is this knowledge sufficient to create a comprehensive curriculum for '{level}' level?
If YES: return {{"is_sufficient": true, "queries": []}}
If NO: return {{"is_sufficient": false, "queries": ["query1", "query2"]}} 
Generate 1 to 3 targeted DuckDuckGo search queries to find the missing advanced/specific information.
IMPORTANT: Dynamically target authoritative domains based on the topic. 
For example, for coding append 'site:react.dev' or 'site:github.com'. For finance append 'site:investopedia.com', etc.

Return ONLY valid JSON.

Current Knowledge Outline:
{outline}
"""
        try:
             response = self.llm.invoke([SystemMessage(content="You output ONLY valid JSON."), HumanMessage(content=prompt)])
             content_str = response.content
             if isinstance(content_str, list):
                 content_str = "".join([block.get("text", "") for block in content_str if isinstance(block, dict)])
                 
             raw_content = str(content_str).replace("```json", "").replace("```", "").strip()
             return json.loads(raw_content)
        except Exception as e:
             print(f"Error evaluating sufficiency: {e}")
             return {"is_sufficient": False, "queries": [f"{topic} {level} tutorial explanation"]}

    def search_web(self, query: str) -> List[str]:
        """
        Uses DuckDuckGo to search the web and extracts URLs from the results.
        """
        # Blacklist: paywalled course platforms, low-quality aggregators, or sites that
        # require login/purchase to access real content
        blacklist = [
            "pinterest.com", "quora.com", "medium.com/tag", "coursehero.com", "chegg.com",
            "udemy.com", "coursera.org", "edx.org", "skillshare.com", "udacity.com",
            "pluralsight.com", "linkedin.com/learning", "oreilly.com", "manning.com",
            "datacamp.com", "codecademy.com",
        ]
        print(f"Searching web for: '{query}'")
        try:
            results_str = self.search_tool.invoke(query)
            # DuckDuckGoSearchResults returns a string, e.g., "[snippet: ..., title: ..., link: https://...], [...]"
            # We need to extract the links.
            urls = re.findall(r'link:\s*(https?://[^\],]+)', results_str)
            
            # Filter blacklist
            filtered_urls = []
            for u in urls:
                if not any(b in u.lower() for b in blacklist):
                    filtered_urls.append(u)
                    
            # Remove duplicates and limit to top 3 to avoid excessive scraping
            unique_urls = list(dict.fromkeys(filtered_urls))[:4]
            print(f"Found URLs: {unique_urls}")
            return unique_urls
        except Exception as e:
            print(f"Error searching web: {e}")
            return []

    async def conduct_research(self, topic: str, level: str, provided_urls: List[str] = None) -> str:  #we used none here for Provided_urls to prevent crash
        """
        Main orchestration loop for autonomous research using Query Fanout.
        """
        if provided_urls is None:
            provided_urls = []
            
        print(f"\n--- Starting Research for '{topic}' ({level} level) ---")
        
        knowledge_base = ""
        processed_urls = set()
        MAX_SCRAPE_LIMIT = 8  # Increased slightly because of fanout speed
        scrape_count = 0
        
        # Step 1: Extract from provided sources
        for url in provided_urls:
            if url in processed_urls: continue
            if scrape_count >= MAX_SCRAPE_LIMIT:
                print(f"Scrape limit ({MAX_SCRAPE_LIMIT}) reached during provided sources. Stopping.")
                break
            print(f"Processing provided source: {url}")
            content = await self.scraper.extract_source(url)
            scrape_count += 1
            
            # Put provided URLS through quality gate too, just in case they gave a bad link
            if self.evaluate_source_quality(content, topic, level):
                 knowledge_base += f"\n\nSource: {url}\n{content}\n"
            processed_urls.add(url)
            
        # Step 2 & 3: Evaluate Sufficiency & Autonomous Fanout Loop
        max_search_loops = 2
        loops = 0
        
        while loops < max_search_loops:
            if scrape_count >= MAX_SCRAPE_LIMIT:
                print(f"Scrape limit ({MAX_SCRAPE_LIMIT}) reached. Stopping autonomous search.")
                break

            print("\nEvaluating current knowledge sufficiency...")
            eval_result = self.evaluate_knowledge_sufficiency(knowledge_base, topic, level)
            
            if eval_result.get("is_sufficient", False) and len(knowledge_base) > 500:
                print("Knowledge is deemed sufficient!")
                break
                
            queries = eval_result.get("queries", [])
            if not queries:
                 # If LLM said insufficient but gave no queries, fallback
                 queries = [f"{topic} {level} concepts guide"]
                 
            print(f"Knowledge insufficient. Generated search queries: {queries}")
            
            # ---------------------------------------------------------
            # QUERY FANOUT: Parallel Search
            # ---------------------------------------------------------
            print(f"Executing Fanout Search for {len(queries)} queries concurrently...")
            search_tasks = [asyncio.to_thread(self.search_web, query) for query in queries]
            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            new_urls = []
            for result_list in search_results:
                if isinstance(result_list, list):
                    for url in result_list:
                        if url not in processed_urls and url not in new_urls:
                            new_urls.append(url)
                            
            if not new_urls:
                print("Fanout Search yielded no new URLs. Stopping research loop.")
                break
                
            print(f"Fanout Search pooled {len(new_urls)} unique URLs.")
            
            # We don't want to scrape 20 URLs if we only need a few more to hit MAX_SCRAPE_LIMIT
            urls_to_scrape = new_urls[:(MAX_SCRAPE_LIMIT - scrape_count)]
            if not urls_to_scrape:
                break
                
            # ---------------------------------------------------------
            # QUERY FANOUT: Parallel Scrape
            # ---------------------------------------------------------
            print(f"Executing Fanout Scrape for {len(urls_to_scrape)} URLs concurrently...")
            scrape_tasks = [self.scraper.extract_source(url) for url in urls_to_scrape]
            scraped_contents = await asyncio.gather(*scrape_tasks, return_exceptions=True)
            scrape_count += len(urls_to_scrape)
            
            # Quality Gate processing (sequential to prevent LLM rate limits)
            new_content_added = False
            for url, content in zip(urls_to_scrape, scraped_contents):
                processed_urls.add(url)
                if isinstance(content, Exception):
                    print(f"Scrape failed for {url}: {content}")
                    continue
                if not content:
                    continue
                    
                if self.evaluate_source_quality(content, topic, level):
                    print(f"🟢 Source {url} passed quality gate. Adding to knowledge base.")
                    knowledge_base += f"\n\nSource: {url}\n{content}\n"
                    new_content_added = True
                else:
                    print(f"🔴 Source {url} rejected by quality gate.")
                    
            if not new_content_added:
                print("Fanout yielded no new valid information. Stopping research loop.")
                break
                    
            loops += 1
            
        print(f"\n--- Research Complete (total scrapes: {scrape_count}/{MAX_SCRAPE_LIMIT}) ---")
        return knowledge_base

# Example usage (for testing)
async def main():
    agent = ResearchAgent()
    scraper = WebScraper()
    # Test Scenario 3: No sources provided
    topic = "MLOPS"
    level = "Begginer"
    
    print("Testing Autonomous Research with NO sources...")
    knowledge = await agent.conduct_research(topic, level)
    print(f"\nFinal extracted knowledge length: {len(knowledge)} characters")
    print("Preview:\n" + knowledge[:500] + "\n...\n")

    # To test Scenario 1 & 2, uncomment below:
    # yt_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ" # Rickroll (should fail quality gate for AI topics)
    # await agent.conduct_research("Machine Learning", "Advanced", [yt_url])

    # Test Web
    url = "https://en.wikipedia.org/wiki/Reinforcement_learning"
    print("\nWeb Extractor:")
    content = await agent.scraper.scrape_url(url)
    print(content[:200] + "...")

if __name__ == "__main__":
    asyncio.run(main())
