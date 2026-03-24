#!/usr/bin/env python3
"""
Comprehensive PDF analysis tool - diagnose rendering issues
"""

import sys
import fitz  # PyMuPDF
from pathlib import Path

def analyze_pdf(pdf_path):
    """Analyze PDF structure and content"""
    print("=" * 70)
    print(f"PDF ANALYSIS: {Path(pdf_path).name}")
    print("=" * 70)
    
    try:
        doc = fitz.open(pdf_path)
        print(f"\n✓ PDF opened successfully")
        print(f"  Pages: {len(doc)}")
        print(f"  Format: {doc.is_pdf}")
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            print(f"\n--- Page {page_num + 1} ---")
            
            # Get page dimensions
            rect = page.rect
            print(f"  Dimensions: {rect.width:.0f} x {rect.height:.0f} pt")
            
            # Extract text
            text_content = page.get_text()
            if text_content.strip():
                print(f"  Text found: {len(text_content)} characters")
                print(f"  Preview: {text_content[:100]}...")
            else:
                print(f"  Text: (none extracted)")
            
            # Get text blocks with positioning
            text_dict = page.get_text("dict")
            text_blocks = []
            
            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:  # Text block
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "").strip()
                            if text:
                                bbox = span.get("bbox", ())
                                font_size = span.get("size", 0)
                                font_name = span.get("font", "")
                                color = span.get("color", None)
                                text_blocks.append({
                                    "text": text,
                                    "bbox": bbox,
                                    "font_size": font_size,
                                    "font": font_name,
                                    "color": color
                                })
            
            if text_blocks:
                print(f"  Text blocks found: {len(text_blocks)}")
                for i, block in enumerate(text_blocks[:5]):  # Show first 5
                    print(f"    [{i+1}] '{block['text'][:50]}' | Font: {block['font']} @ {block['font_size']}pt | Color: {block['color']}")
            
            # Check for graphics/shapes
            graphics = []
            for shape in page.get_drawings():
                graphics.append({
                    "type": shape.type,
                    "rect": shape.rect,
                    "color": shape.color,
                    "fill": shape.fill
                })
            
            if graphics:
                print(f"  Graphics/shapes: {len(graphics)}")
                for i, graphic in enumerate(graphics[:3]):
                    print(f"    [{i+1}] {graphic['type']} at {graphic['rect']} | Fill: {graphic['fill']} | Color: {graphic['color']}")
        
        doc.close()
        print("\n" + "=" * 70)
        return True
        
    except Exception as e:
        print(f"✗ Error analyzing PDF: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
    else:
        # Try to find the provided PDF
        pdf_file = "Vihaan Virendra Ghelani_compressed_high-edited.pdf"
    
    if Path(pdf_file).exists():
        analyze_pdf(pdf_file)
    else:
        print(f"PDF file not found: {pdf_file}")
        print(f"Current directory: {Path.cwd()}")
        print(f"Files in directory: {list(Path.cwd().glob('*.pdf'))}")
