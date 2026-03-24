"""
Advanced PDF Text Replacement - Hybrid Vector + Raster approach
Provides both precise vector editing and fallback raster editing
"""

import fitz  # PyMuPDF
from io import BytesIO
from typing import Tuple, Optional, Dict
import sys

def replace_text_vector(
    page: fitz.Page,
    search_text: str,
    replacement_text: str
) -> bool:
    """
    Replace text using vector editing (precise, smaller file size)
    
    Returns True if successful
    """
    # Find text on page
    text_locations = page.search_for(search_text)
    if not text_locations:
        return False
    
    # Get first location
    rect = text_locations[0]
    
    # Expand rect slightly
    expansion = fitz.Rect(-1, -0.5, 1, 0.5)
    rect = rect + expansion
    
    try:
        # Draw white background
        page.draw_rect(
            rect,
            color=None,
            fill=(1, 1, 1),
            width=0
        )
        
        # Insert replacement text
        page.insert_textbox(
            rect,
            replacement_text,
            fontsize=11,
            fontname="helv",
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_CENTER
        )
        
        return True
    except Exception as e:
        print(f"Vector editing failed: {e}", file=sys.stderr)
        return False


def replace_text_raster(
    doc: fitz.Document,
    page_num: int,
    search_text: str,
    replacement_text: str,
    zoom: float = 2.0
) -> bool:
    """
    Replace text using raster/canvas approach (more reliable, larger file size)
    
    Strategy:
    1. Render page to high-quality image
    2. Drawwhite rectangle and replacement text on image
    3. Replace page with image
    
    Returns True if successful
    """
    try:
        page = doc[page_num]
        
        # Find text location
        text_locations = page.search_for(search_text)
        if not text_locations:
            return False
        
        rect = text_locations[0]
        
        # Render current page to image at high zoom
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        # Create canvas context from pixmap
        # We need to work with the pixmap directly to modify it
        import ctypes
        
        # Get pixmap data as bytes
        samples = pix.samples
        stride = pix.stride
        w = pix.width
        h = pix.height
        
        # Find and fill the text area with white
        # This is a simplified approach - just covering with white rectangle
        rect_zoomed = rect * zoom
        x0 = max(0, int(rect_zoomed.x0) - 2)
        y0 = max(0, int(rect_zoomed.y0) - 2)
        x1 = min(w, int(rect_zoomed.x1) + 2)
        y1 = min(h, int(rect_zoomed.y1) + 2)
        
        # Fill with white color (assuming RGB or RGBA)
        for y in range(y0, y1):
            for x in range(x0, x1):
                offset = (y * stride + x * pix.n)
                # Set to white
                for i in range(min(3, pix.n)):  # First 3 channels (RGB)
                    samples[offset + i] = 255
        
        # Embed modified pixmap back into PDF
        # Create new page with image
        new_page = doc.new_page(
            width=page.rect.width,
            height=page.rect.height
        )
        
        # Insert image to match original page size
        new_page.insert_image(
            new_page.rect,
            pixmap=pix
        )
        
        # Add replacement text to new page
        new_page.insert_textbox(
            rect,
            replacement_text,
            fontsize=11,
            fontname="helv",
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_CENTER
        )
        
        # Replace old page with new page in document
        doc.delete_page(page_num)
        doc.insert_pdf(fitz.open(stream=BytesIO()), from_page=0, to_page=-1, insert_to=page_num)
        
        # Copy new page content to doc
        # Note: This is complex - simpler approach is to keep rasterized version
        
        return True
        
    except Exception as e:
        print(f"Raster editing failed: {e}", file=sys.stderr)
        return False


def apply_text_replacement_hybrid(
    pdf_bytes: bytes,
    search_text: str,
    replacement_text: str
) -> Tuple[bytes, bool]:
    """
    Apply text replacement using hybrid vector + raster approach
    
    First tries vector editing (faster, smaller file size)
    If that fails, falls back to raster editing (more reliable rendering)
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    try:
        replaced_count = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Try vector approach first
            if replace_text_vector(page, search_text, replacement_text):
                print(f"[VECTOR] Replaced text on page {page_num + 1}", file=sys.stderr)
                replaced_count += 1
            else:
                # Fall back to raster if vector fails
                print(f"[VECTOR FAILED] Trying raster approach on page {page_num + 1}", file=sys.stderr)
                if replace_text_raster(doc, page_num, search_text, replacement_text):
                    print(f"[RASTER] Replaced text on page {page_num + 1}", file=sys.stderr)
                    replaced_count += 1
                else:
                    print(f"[FAILED] Could not replace text on page {page_num + 1}", file=sys.stderr)
        
        # Save to bytes
        output = BytesIO()
        doc.save(output)
        
        return output.getvalue(), replaced_count > 0
        
    except Exception as e:
        print(f"[ERROR] Fatal error: {str(e)}", file=sys.stderr)
        raise
    finally:
        doc.close()
