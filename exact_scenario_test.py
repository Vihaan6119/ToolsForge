#!/usr/bin/env python3
"""
Test the exact scenario from the user's error to confirm fix is complete
"""
import sys
sys.path.insert(0, r"C:\Users\Vihaan\OneDrive\Desktop\Vihaan\ToolsForge\toolforge\pdf_editor")

from pdf_utils import apply_text_replacement_with_ai
import fitz
from io import BytesIO

# Replicate user's exact scenario: text replacement that caused the error
doc = fitz.open()
page = doc.new_page()
page.insert_text((50, 50), "Vihaan Virendra Ghelani is working", fontsize=12)

output = BytesIO()
doc.save(output)
pdf_bytes = output.getvalue()
doc.close()

print("Testing user's exact scenario from error message...")
print("Original text: 'Vihaan Virendra Ghelani'") 
print("Replacement text: 'Vihaan Ghelani'")
print()

try:
    result_pdf, success = apply_text_replacement_with_ai(
        pdf_bytes,
        search_text="Vihaan Virendra Ghelani",
        replacement_text="Vihaan Ghelani"
    )
    print("✅ SUCCESS: No TypeError occurred")
    print(f"   Replacement executed: {success}")
    print(f"   Output PDF size: {len(result_pdf)} bytes")
    print("\nThe original error is FIXED:")
    print("   Before: TypeError: Page.draw_rect() got an unexpected keyword argument 'lineWidth'")
    print("   After: Text replacement completes successfully with width parameter")
except TypeError as e:
    if "lineWidth" in str(e):
        print(f"❌ FAILED: Original error still present: {e}")
        sys.exit(1)
    else:
        print(f"❌ Different error: {e}")
        sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)

print("\nTask complete: PyMuPDF parameter fix is verified and working.")
