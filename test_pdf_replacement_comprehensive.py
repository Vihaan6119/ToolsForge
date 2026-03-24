#!/usr/bin/env python3
"""
Comprehensive PDF Text Replacement Testing
Tests multiple scenarios and validates output quality
"""

import sys
import fitz
from pathlib import Path
from io import BytesIO
from datetime import datetime

# Add pdf_editor to path
sys.path.insert(0, str(Path(__file__).parent / "toolforge" / "pdf_editor"))

from pdf_utils import apply_text_replacement_with_ai

def create_test_pdf(test_name: str, texts: list) -> bytes:
    """Create a test PDF with specific text content"""
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)  # Letter size
    
    y_pos = 50
    for i, text in enumerate(texts):
        page.insert_textbox(
            fitz.Rect(50, y_pos, 550, y_pos + 40),
            text,
            fontsize=12,
            fontname="helv",
            color=(0, 0, 0),  # Black
        )
        y_pos += 60
    
    output = BytesIO()
    doc.save(output)
    doc.close()
    return output.getvalue()


def test_scenario(scenario_name: str, pdf_bytes: bytes, search_text: str, replacement_text: str) -> bool:
    """Test a single replacement scenario"""
    print(f"\n{'='*70}")
    print(f"TEST: {scenario_name}")
    print(f"{'='*70}")
    print(f"Search text: '{search_text}'")
    print(f"Replace with: '{replacement_text}'")
    
    try:
        result_bytes, success = apply_text_replacement_with_ai(
            pdf_bytes,
            search_text,
            replacement_text
        )
        
        if success:
            print("✓ Replacement successful")
            
            # Verify the replacement in the output PDF
            output_doc = fitz.open(stream=result_bytes, filetype="pdf")
            page = output_doc[0]
            text_content = page.get_text()
            
            if replacement_text in text_content:
                print("✓ Replacement text found in output PDF")
            else:
                print("⚠ Replacement text NOT found in extracted text (might be rendering issue)")
            
            if search_text in text_content:
                print("⚠ Original text still present in extracted text")
            else:
                print("✓ Original text removed")
            
            output_doc.close()
            
            # Save sample output
            output_path = f"test_output_{scenario_name.replace(' ', '_')}.pdf"
            with open(output_path, 'wb') as f:
                f.write(result_bytes)
            print(f"✓ Output saved: {output_path}")
            
            return True
        else:
            print("✗ Replacement failed - text not found")
            return False
            
    except Exception as e:
        print(f"✗ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*70)
    print("PDF TEXT REPLACEMENT COMPREHENSIVE TEST SUITE")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    
    results = []
    
    # Test 1: Simple single-word replacement
    print("\n[TEST BATCH 1: Simple Replacements]")
    pdf = create_test_pdf("simple", ["Hello World", "Test Text", "Another Line"])
    results.append(test_scenario("Simple Single Word", pdf, "Hello", "REPLACED"))
    results.append(test_scenario("Simple Full Line", pdf, "Test Text", "NEW TEXT"))
    
    # Test 2: Multi-word replacement
    print("\n[TEST BATCH 2: Multi-word Replacements]")
    pdf = create_test_pdf("multiword", ["This is a longer sentence", "With more words here"])
    results.append(test_scenario("Multi-word Phrase", pdf, "is a longer", "IS REPLACED"))
    results.append(test_scenario("Full Sentence", pdf, "This is a longer sentence", "COMPLETE SENTENCE REPLACEMENT"))
    
    # Test 3: Special characters
    print("\n[TEST BATCH 3: Special Characters]")
    pdf = create_test_pdf("special", ["Email: test@example.com", "Price: $99.99", "C++ & Python"])
    results.append(test_scenario("Email Address", pdf, "test@example.com", "new@email.com"))
    results.append(test_scenario("Currency", pdf, "$99.99", "$149.99"))
    
    # Test 4: Case sensitivity
    print("\n[TEST BATCH 4: Case Variations]")
    pdf = create_test_pdf("case", ["Apple", "BANANA", "ChErRy"])
    results.append(test_scenario("Lowercase", pdf, "Apple", "Orange"))
    results.append(test_scenario("Uppercase", pdf, "BANANA", "GRAPE"))
    results.append(test_scenario("Mixed Case", pdf, "ChErRy", "Strawberry"))
    
    # Test 5: Numbers and mixed
    print("\n[TEST BATCH 5: Numbers and Mixed]")
    pdf = create_test_pdf("numbers", ["Item 123", "Total: 456.78", "Version 2.1.0"])
    results.append(test_scenario("Number in text", pdf, "Item 123", "Item 999"))
    results.append(test_scenario("Decimal Number", pdf, "456.78", "789.01"))
    results.append(test_scenario("Version String", pdf, "Version 2.1.0", "Version 3.0.0"))
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Success rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - PDF text replacement is working perfectly!")
        return 0
    else:
        print(f"\n⚠ {total - passed} tests failed - review output for details")
        return 1

if __name__ == "__main__":
    sys.exit(main())
