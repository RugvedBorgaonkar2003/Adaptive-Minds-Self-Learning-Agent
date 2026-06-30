import uuid
import datetime
from typing import List, Dict, Any
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

class DocumentProcessor:
    """
    Handles the "Digestion" of unstructured text into clean, structured chunks 
    optimized for Vector DB ingestion and LLM retrieval.
    """
    def __init__(self, chunk_size: int = 1500, chunk_overlap: int = 200):
        # 1. First Pass: Split logically by Markdown headers
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
            ("####", "Header 4"),
        ]
        self.markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on,
            strip_headers=False # Keep the semantic meaning of the headers in the text if desired
        )
        
        # 2. Second Pass: Split strictly by size to prevent LLM overflow
        # 'chunk_size' here refers to characters. 1500 chars ~ 350-400 tokens
        # 'chunk_overlap' ensures sentences/ideas cut in half bridge across chunks
        self.recursive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""] # It tries to split exactly at paragraphs first, then sentences, then words
        )

    def process_knowledge_base(self, orchestrator_output: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes the raw JSON output from the SourceOrchestrator and runs the
        Two-Pass chunking strategy, ensuring parent metadata trickles down
        to every single child chunk.
        """
        print(f"\n--- Processing {len(orchestrator_output)} sources into semantic chunks ---")
        final_chunks: List[Dict[str, Any]] = []

        for source in orchestrator_output:
            # We only want to process sources that actually passed the quality gate
            if source.get("status") != "passed" or not source.get("content"):
                continue

            raw_text = source["content"]
            source_id = source["source_id"]
            
            # --- PASS 1: Markdown Splitting ---
            # This creates 'Document' objects where the text is broken by Header
            # and automatically populates 'Document.metadata' with {"Header 1": "..."}
            md_docs = self.markdown_splitter.split_text(raw_text)

            # --- PASS 2: Recursive Character Splitting ---
            # If the text under an H2 header is 10,000 words long, this safely slices it
            # into 1500 character chunks, while copying the {"Header 1": "..."} to each slice.
            chunked_docs = self.recursive_splitter.split_documents(md_docs)

            # --- Formatting Output ---
            # Now we combine the Markdown metadata with the Orchestrator metadata
            for i, doc in enumerate(chunked_docs):
                # Inherit metadata from Phase 1 and aggressively sanitize 'None' to ''
                # to prevent ChromaDB validation crashes.
                combined_metadata = {
                    "source_id": source_id or "",
                    "url": source.get("url") or "",
                    "type": source.get("type") or "",
                    "title": source.get("title") or "",
                    "origin": source.get("origin") or "",
                    "timestamp": datetime.datetime.now().isoformat()
                }
                
                # Merge in the Markdown Header metadata (if any headers existed)
                # Safely checking if metadata exists to prevent the 'No Header' PDF edge case crash
                if hasattr(doc, 'metadata') and isinstance(doc.metadata, dict):
                    safe_doc_metadata = {k: (v if v is not None else "") for k, v in doc.metadata.items()}
                    combined_metadata.update(safe_doc_metadata)

                chunk_entry = {
                    # Every chunk gets a unique ID, but references its parent source_id
                    "chunk_id": f"{source_id}_chunk_{i}",
                    "content": doc.page_content,
                    "metadata": combined_metadata
                }
                final_chunks.append(chunk_entry)

        print(f"Successfully generated {len(final_chunks)} perfectly sized chunks.")
        return final_chunks

# Example visual test
if __name__ == "__main__":
    processor = DocumentProcessor(chunk_size=300, chunk_overlap=50) # Tiny sizes just for demo
    
    mock_orchestrator_output = [
        {
            "source_id": "uuid-9999",
            "url": "https://wiki.org/rl",
            "type": "web",
            "title": "Intro to RL",
            "status": "passed",
            "origin": "user",
            "content": "# Reinforcement Learning\nRL is a huge field about acting in environments.\n\n## The Bellman Equation\nThe Bellman equation is the core math of value functions. It shows how the value of a state depends on the immediate reward plus the value of the next state. " * 5 # Multiplying to make it arbitrarily long for the recursive splitter
        }
    ]

    print("Running Mock Data through Processor...")
    chunks = processor.process_knowledge_base(mock_orchestrator_output)
    
    for c in chunks[:3]: # Print first 3
        print(f"\n[Chunk {c['chunk_id']}]")
        print(f"Metadata: {c['metadata']}")
        print(f"Text Content ({len(c['content'])} chars): {c['content'][:150]}...")
