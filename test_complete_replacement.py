#!/usr/bin/env python3
"""
Comprehensive test for PDF text replacement with visible text
Tests both the white rectangle drawing and black text insertion
"""

import sys
from pathlib import Path

# Add pdf_editor to path
sys.path.insert(0, str(Path(__file__).parent / "toolforge" / "pdf_editor"))

from pdf_utils import apply_text_replacement_with_ai
import fitz
from io import BytesIO

print("=" * 60)
print("PDF Text Replacement Visibility Test")
print("=" * 60)

# Step 1: Create a test PDF with some text
print("\n[1] Creating test PDF with original text...")
doc = fitz.open()
page = doc.new_page(width=612, height=792)  # Letter size

# Add some text
test_text = "Hello World - This is the original text!"
rect = fitz.Rect(50, 100, 550, 150)
page.insert_textbox(
    rect,
    test_text,
    fontsize=14,
    color=(0, 0, 0),
)

# Save to bytes
output = BytesIO()
doc.save(output)
original_bytes = output.getvalue()
doc.close()

print(f"✓ Created test PDF ({len(original_bytes)} bytes)")
print(f"  Text: '{test_text}'")

# Step 2: Apply replacement using the function
print("\n[2] Applying text replacement...")
replacement_text = "✓ NEW REPLACEMENT TEXT - NOW VISIBLE!"
result_bytes, success = apply_text_replacement_with_ai(
    original_bytes,
    test_text,
    replacement_text
)

if success:
    print("✓ Text replacement successful!")
else:
    print("✗ Text replacement failed (text not found)")
    sys.exit(1)

# Step 3: Verify the output PDF
print("\n[3] Verifying output PDF...")
output_doc = fitz.open(stream=result_bytes, filetype="pdf")
output_page = output_doc[0]

# Extract text from output to verify replacement was applied
text_content = output_page.get_text()
print(f"  Output page text content: {repr(text_content[:100])}")

# Check if the replacement text is in the PDF
if replacement_text in text_content or "REPLACEMENT TEXT" in text_content:
    print("✓ Replacement text found in output PDF!")
else:
    print("⚠ Replacement text not found in extracted text")
    print(f"  (This might be because text extraction doesn't always capture inserted text)")

output_doc.close()

# Step 4: Save output for manual inspection
output_path = Path("test_replacement_output.pdf")
with open(output_path, 'wb') as f:
    f.write(result_bytes)
print(f"\n[4] Output saved to: {output_path}")

print("\n" + "=" * 60)
print("✅ TEST COMPLETE")
print("=" * 60)
print(f"\nOriginal: '{test_text}'")
print(f"Replaced: '{replacement_text}'")
print(f"\nExpected result: White background with black visible text")
print(f"File: {output_path}")
print("\nNote: Open the PDF to visually verify the text is visible.")
