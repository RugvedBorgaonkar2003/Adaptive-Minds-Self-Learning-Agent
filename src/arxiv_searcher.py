import os
import arxiv
from typing import List, Dict

class ArxivSearcher:
    def __init__(self, download_dir: str = "D:\\Arxiv Research Papers"):
        """
        Initializes the Arxiv searcher.
        Sets up a directory to temporarily download the PDFs before they are passed 
        to our generic PDFParser for extraction.
        """
        self.download_dir = download_dir
        os.makedirs(self.download_dir, exist_ok=True)
        # We use a custom client to allow for easier configuration if needed
        self.client = arxiv.Client()

    def search_and_download(self, topic: str, max_results: int = 3, sort_by_relevance: bool = True) -> List[Dict[str, str]]:
        """
        Searches Arxiv for the given topic, prioritizing highly-relevant, recent research papers.
        Downloads the top results as PDFs and returns their local file paths along with metadata.
        
        Args:
            topic: The query string (e.g., "Reinforcement Learning")
            max_results: Number of papers to fetch
            sort_by_relevance: If true, sorts by relevance, otherwise sorts by submitted date
            
        Returns:
            A list of dictionaries containing 'title', 'summary', and 'local_path' for each downloaded paper.
        """
        print(f"Searching Arxiv for top {max_results} papers on: '{topic}'...")
        
        sort_criterion = arxiv.SortCriterion.Relevance if sort_by_relevance else arxiv.SortCriterion.SubmittedDate
        
        # We construct the search query. Often users provide simple topics, 
        # so searching in 'all' fields is best for general discovery.
        search = arxiv.Search(
            query=topic,
            max_results=max_results,
            sort_by=sort_criterion
        )

        results = []
        try:
            for result in self.client.results(search):
                print(f"Found: {result.title}")
                
                # Sanitize filename
                safe_title = "".join([c for c in result.title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
                filename = f"{safe_title.replace(' ', '_')}.pdf"
                local_path = os.path.join(self.download_dir, filename)
                
                # Download the PDF if it doesn't already exist
                if not os.path.exists(local_path):
                    print(f"Downloading to: {local_path}")
                    result.download_pdf(dirpath=self.download_dir, filename=filename)
                else:
                    print(f"File already exists: {local_path}")
                
                results.append({
                    "title": result.title,
                    "authors": [author.name for author in result.authors],
                    "published": result.published.strftime("%Y-%m-%d"),
                    "summary": result.summary,
                    "arxiv_url": result.entry_id,
                    "local_path": local_path
                })
                
        except Exception as e:
            print(f"Error during Arxiv search/download: {e}")
            
        return results

if __name__ == "__main__":
    # Test block template
    searcher = ArxivSearcher()
    # Simple test for finding RL papers
    downloaded_papers = searcher.search_and_download("Reinforcement Learning", max_results=1)
    for paper in downloaded_papers:
        print("\n--- Downloaded Paper metadata ---")
        for k, v in paper.items():
            print(f"{k}: {v}")
