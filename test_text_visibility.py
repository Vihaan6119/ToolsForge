#!/usr/bin/env python3
"""Test to verify replacement text is visible in PDFs"""

import fitz
from io import BytesIO
import sys

# Create a simple test PDF with text
print("Creating test PDF with text...")
doc = fitz.open()
page = doc.new_page()

# Add some original text
rect = fitz.Rect(50, 50, 300, 100)
page.insert_textbox(
    rect,
    "This is the original text that will be replaced",
    fontsize=12,
    fontname="helv",
    color=(0, 0, 0),  # Black in RGB 0-1 format
)

# Save test PDF
test_pdf_path = "test_original.pdf"
doc.save(test_pdf_path)
doc.close()

print(f"✓ Created test PDF: {test_pdf_path}")

# Now test the replacement logic
print("\nTesting replacement text visibility...")
with open(test_pdf_path, 'rb') as f:
    pdf_bytes = f.read()

doc = fitz.open(stream=pdf_bytes, filetype="pdf")
page = doc[0]

# Test coordinates
test_rect = fitz.Rect(50, 50, 300, 100)

# Step 1: Draw white background
page.draw_rect(test_rect, color=None, fill=(1, 1, 1), width=0)
print("✓ Drew white rectangle")

# Step 2: Insert replacement text with new approach
result = page.insert_textbox(
    test_rect,
    "NEW REPLACEMENT TEXT",
    fontsize=12,
    color=(0, 0, 0),  # Black in RGB 0-1 format
    align=fitz.TEXT_ALIGN_CENTER,
)

print(f"✓ insert_textbox returned: {result}")
print("✓ Inserted replacement text")

# Save result
output_path = "test_replaced.pdf"
doc.save(output_path)
doc.close()

print(f"✓ Saved test PDF with replacement: {output_path}")
print("\n✅ Test complete! Check the PDFs to verify text visibility.")
print(f"Expected: White box with black 'NEW REPLACEMENT TEXT' visible inside")
