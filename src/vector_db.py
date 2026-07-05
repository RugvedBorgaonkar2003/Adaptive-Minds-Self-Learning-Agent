import os
import re
from typing import List, Dict, Any
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

class VectorDBManager:
    """
    Handles the initialization, insertion, and retrieval of knowledge from the 
    local ChromaDB instance, serving as the Agent's Long-Term Memory.
    """
    
    def _sanitize_collection_name(self, name: str) -> str:
        """
        ChromaDB collection names must be 3-63 characters, start/end with an alphanumeric,
        and contain only alphanumeric characters, underscores, or hyphens.
        """
        # Replace spaces and invalid chars with underscores
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
        # Ensure it doesn't start/end with punctuation
        safe_name = safe_name.strip('_-')
        # Ensure length
        if len(safe_name) < 3:
            safe_name = safe_name.ljust(3, '_')
        return safe_name[:63].lower()

    def __init__(self, topic_name: str = "general_knowledge", persist_directory: str = "./data/chroma_db"):
        self.persist_directory = persist_directory
        # Force all DB managers to use the unified general_knowledge collection
        self.collection_name = self._sanitize_collection_name("general_knowledge")
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # We use a highly efficient, CPU-friendly open-source embedding model (all-MiniLM-L6-v2)
        # This translates our text chunks into numerical vectors (lists of floats).
        print("Initializing Embedding Model...")
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Connect to (or create) the local persistent ChromaDB using the Topic as the Collection Folder
        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )
        print(f"Connected to ChromaDB Collection: '{self.collection_name}' at {self.persist_directory}")

    def insert_chunks(self, chunks: List[Dict[str, Any]]) -> bool:
        """
        Takes the JSON chunks from DocumentProcessor, formats them as LangChain Documents,
        and permanently stores them in the Vector DB.
        """
        if not chunks:
            print("Warning: No chunks provided to Vector DB to insert.")
            return False
            
        print(f"\nInserting {len(chunks)} chunks into Vector DB...")
        
        documents = []
        for chunk in chunks:
            # Langchain expects 'Document' objects for adding to the vector store
            doc = Document(
                page_content=chunk["content"],
                metadata=chunk["metadata"],
                id=chunk["chunk_id"] # Pass the distinct UUID if supported, but typically added separately
            )
            documents.append(doc)

        try:
            # Generate exactly matching UUIDs for chroma
            ids = [chunk["chunk_id"] for chunk in chunks]
            
            # This automatically embeds the text and saves to disk
            self.vector_store.add_documents(documents=documents, ids=ids)
            print(f"✅ Successfully embedded and saved {len(documents)} chunks.")
            return True
        except Exception as e:
            print(f"❌ Error inserting chunks into Vector DB: {e}")
            return False

    def retrieve_relevant_knowledge(self, query: str, top_k: int = 5) -> List[Document]:
        """
        Searches the Vector DB for the chunks mathematically most similar to the query.
        Returns the top_k matching chunks containing their original text and metadata.
        """
        print(f"\nRetrieving top {top_k} results for query: '{query}'")
        try:
            results = self.vector_store.similarity_search(query, k=top_k)
            return results
        except Exception as e:
            print(f"❌ Error during retrieval: {e}")
            return []

if __name__ == "__main__":
    # Test Block
    db = VectorDBManager()
    
    mock_chunks = [
        {
            "chunk_id": "test-uuid-1",
            "content": "The Bellman equation is a fundamental concept in dynamic programming and reinforcement learning. It writes the value of a decision problem at a certain point in time in terms of the payoff from some initial choices and the value of the remaining decision problem that results from those initial choices.",
            "metadata": {"source_id": "123", "type": "web", "Header 1": "Reinforcement Learning"}
        },
        {
            "chunk_id": "test-uuid-2",
            "content": "A transformer is a deep learning architecture developed by Google and based on the multi-head attention mechanism.",
            "metadata": {"source_id": "999", "type": "pdf", "Header 1": "Deep Learning"}
        }
    ]
    
    print("\n--- Testing Insertion ---")
    db.insert_chunks(mock_chunks)
    
    print("\n--- Testing Retrieval ---")
    search_results = db.retrieve_relevant_knowledge("What is the math behind value functions?")
    
    for i, res in enumerate(search_results):
        print(f"\nResult {i+1}:")
        print(f"Metadata: {res.metadata}")
        print(f"Text Preview: {res.page_content[:150]}...")
