import os
import pymupdf4llm

class PDFParser:
    def __init__(self, output_dir: str = "./data/extracted_images"):
        """
        Initializes the PDF parser. We set up an output directory in case 
        we want to extract and save images from the PDF for multimodal use later.
        """
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def parse_pdf(self, file_path: str, extract_images: bool = False) -> str:
        """
        Parses a PDF file into clean Markdown format optimized for LLMs.
        This seamlessly handles text structure, lists, and extracts tables as Markdown tables.
        
        Args:
            file_path: Absolute or relative path to the PDF.
            extract_images: If True, saves images to self.output_dir and links them in the markdown.
        """
        print(f"Parsing PDF: {file_path}")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at: {file_path}")

        try:
            # pymupdf4llm directly converts PDF (including tables & layout) into LLM-ready Markdown
            if extract_images:
                md_text = pymupdf4llm.to_markdown(
                    file_path,
                    write_images=True,
                    image_path=self.output_dir,
                    image_format="png"
                )
            else:
                md_text = pymupdf4llm.to_markdown(file_path)
            
            return md_text
        except Exception as e:
            print(f"Error parsing PDF '{file_path}': {e}")
            return f"Error extracting PDF: {str(e)}"

if __name__ == "__main__":
    # Test block template
    parser = PDFParser()
    print("PDF Parser initialized successfully.")
    print("Supports: text extraction, native Markdown table extraction, and image extraction.")
