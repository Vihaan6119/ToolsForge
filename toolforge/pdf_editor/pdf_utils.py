"""
PDF Utilities - Reliable Vector-based text replacement using PyMuPDF
Provides production-quality PDF text editing with proper rendering
"""

import fitz  # PyMuPDF
from io import BytesIO
from typing import Tuple, Optional, Dict, List
import sys
import os

# Import AI interface for DeepSeek integration
sys.path.insert(0, os.path.dirname(__file__))
from ai_interface import get_ai_response


def extract_text_properties(page: fitz.Page, search_text: str) -> Dict:
    """
    Extract font properties from original text
    Returns dict with: fontsize, fontname, color, background_color
    """
    try:
        text_dict = page.get_text("dict")
        
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:  # Not text
                continue
                
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    span_text = span.get("text", "")
                    
                    # Check if this span contains our search text
                    if search_text.lower() in span_text.lower() or span_text.lower() in search_text.lower():
                        # Extract properties
                        fontsize = span.get("size", 12)
                        fontname = span.get("font", "helv")
                        color = span.get("color")
                        
                        # Normalize color format
                        if color is None:
                            color = (0, 0, 0)  # Black default
                        elif isinstance(color, (list, tuple)):
                            # Ensure it's RGB (0-1 range) with exactly 3 components
                            if len(color) == 1:
                                color = (color[0], color[0], color[0])
                            elif len(color) >= 3:
                                color = tuple(color[:3])
                            
                            # Validate all components are in 0-1 range
                            if all(0 <= c <= 1 for c in color):
                                pass  # Already valid
                            elif all(0 <= c <= 255 for c in color):
                                # Convert from 0-255 to 0-1
                                color = tuple(c / 255.0 for c in color)
                        
                        # Final safety check
                        if not isinstance(color, tuple) or len(color) != 3:
                            color = (0, 0, 0)  # Fallback to black
                        
                        return {
                            "fontsize": fontsize,
                            "fontname": fontname,
                            "color": color,
                        }
        
        # Default properties if not found
        return {
            "fontsize": 12,
            "fontname": "helv",
            "color": (0, 0, 0),
        }
    except Exception as e:
        print(f"[WARNING] Could not extract text properties: {str(e)}", file=sys.stderr)
        return {
            "fontsize": 12,
            "fontname": "helv",
            "color": (0, 0, 0),
        }


def find_and_replace_text_simple(
    page: fitz.Page,
    search_text: str,
    replacement_text: str
) -> bool:
    """
    Advanced text replacement that matches original styling
    
    This method:
    1. Find text using native PDF search
    2. Extract original text properties (font, size, color)
    3. Draw background rectangle matching original
    4. Insert replacement text with matched properties
    
    Returns True if successful
    """
    try:
        # Search for text on page
        text_rects = page.search_for(search_text)
        
        if not text_rects:
            return False
        
        # Use first occurrence
        rect = text_rects[0]
        
        # Extract original text properties
        props = extract_text_properties(page, search_text)
        fontsize = props["fontsize"]
        fontname = props["fontname"]
        text_color = props["color"]
        
        # Expand rect to ensure complete coverage (proportional to font size)
        expansion = fitz.Rect(-1, -fontsize * 0.15, 1, fontsize * 0.15)
        rect = rect + expansion
        
        # Ensure rect has valid dimensions
        if rect.width < 1 or rect.height < 1:
            # Make minimum rect based on font size
            rect = fitz.Rect(rect.x0, rect.y0, rect.x0 + len(search_text) * fontsize * 0.5, rect.y0 + fontsize + 2)
        
        # Step 1: Cover original text with background color
        # Use white as the standard background (most common in PDFs)
        page.draw_rect(
            rect,
            color=None,  # No border
            fill=(1, 1, 1),  # White fill
            width=0  # No border width
        )
        
        # Step 2: Insert replacement text with MATCHED properties
        page.insert_textbox(
            rect,
            replacement_text,
            fontsize=fontsize,  # USE ORIGINAL FONT SIZE
            fontname=fontname,  # USE ORIGINAL FONT
            color=text_color,  # USE ORIGINAL TEXT COLOR
            align=fitz.TEXT_ALIGN_CENTER
        )
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Text replacement error: {str(e)}", file=sys.stderr)
        return False


def apply_text_replacement_with_ai(
    pdf_bytes: bytes,
    search_text: str,
    replacement_text: str
) -> Tuple[bytes, bool]:
    """
    Apply text replacement to PDF using PyMuPDF
    
    Args:
        pdf_bytes: Original PDF content
        search_text: Text to find and replace
        replacement_text: New text to insert
        
    Returns:
        Tuple of (modified PDF bytes, success boolean)
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    try:
        replaced_count = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Attempt replacement
            if find_and_replace_text_simple(page, search_text, replacement_text):
                print(f"[SUCCESS] Text replaced on page {page_num + 1}", file=sys.stderr)
                replaced_count += 1
            else:
                print(f"[NO MATCH] Text not found on page {page_num + 1}: '{search_text[:40]}'", file=sys.stderr)
        
        # Save modified PDF
        output = BytesIO()
        doc.save(output)
        
        return output.getvalue(), replaced_count > 0
        
    except Exception as e:
        print(f"[FATAL ERROR] PDF processing failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        raise
    finally:
        doc.close()


def apply_text_replacement(
    pdf_bytes: bytes,
    search_text: str,
    replacement_text: str
) -> bytes:
    """Wrapper function for text replacement"""
    result_bytes, success = apply_text_replacement_with_ai(
        pdf_bytes, search_text, replacement_text
    )
    return result_bytes
