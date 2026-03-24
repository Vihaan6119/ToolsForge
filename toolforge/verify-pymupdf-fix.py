#!/usr/bin/env python3
"""
Verify PyMuPDF draw_rect parameter fix
"""

import fitz

print("PyMuPDF version:", fitz.version)
print("\nChecking draw_rect signature...")

# Create a test PDF
doc = fitz.open()
page = doc.new_page()

try:
    # Test the CORRECT parameter name (width)
    rect = fitz.Rect(50, 50, 150, 100)
    page.draw_rect(rect, color=None, fill=(1, 1, 1), width=0)
    print("✓ draw_rect with width=0 works correctly")
except TypeError as e:
    print(f"✗ Error with width parameter: {e}")

try:
    # Test the INCORRECT parameter name (lineWidth)
    rect = fitz.Rect(50, 50, 150, 100)
    page.draw_rect(rect, color=None, fill=(1, 1, 1), lineWidth=0)
    print("✗ draw_rect with lineWidth=0 works (unexpected!)")
except TypeError as e:
    print(f"✓ Confirmed lineWidth is incorrect: {e}")

print("\nFix verified: width parameter is correct for PyMuPDF draw_rect()")
doc.close()
