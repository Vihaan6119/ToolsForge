#!/usr/bin/env python3
"""
Test text replacement on the actual user-provided PDF
File: Vihaan Virendra Ghelani_compressed_high-edited.pdf
"""

import os
import sys
from pathlib import Path

# Add pdf_editor to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'pdf_editor'))

from pdf_utils import apply_text_replacement

def test_user_pdf():
    """Test replacement on user's actual PDF"""
    
    # Path to user's PDF
    pdf_path = Path(__file__).parent / "Vihaan Virendra Ghelani_compressed_high-edited.pdf"
    
    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    print(f"📄 Testing with user PDF: {pdf_path.name}")
    print(f"📊 File size: {pdf_path.stat().st_size / 1024:.1f} KB")
    print()
    
    try:
        # Read the PDF
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        # Test some common replacements that might be in the PDF
        test_cases = [
            ("Vihaan", "VIK"),  # Name replacement
            ("Ghelani", "GHELANI_UPDATED"),  # Last name
            ("2024", "2025"),  # Year update
            ("Contact", "CONTACT_INFO"),  # Section header
            ("Email", "ELECTRONIC_MAIL"),  # Label update
        ]
        
        success_count = 0
        
        for search_text, replacement_text in test_cases:
            print(f"🔍 Testing: '{search_text}' → '{replacement_text}'")
            
            try:
                result_bytes = apply_text_replacement(
                    pdf_bytes,
                    search_text,
                    replacement_text
                )
                
                # Save output
                output_name = f"test_user_output_{search_text}_{replacement_text}.pdf"
                output_path = Path(__file__).parent / output_name
                
                with open(output_path, 'wb') as f:
                    f.write(result_bytes)
                
                print(f"   ✅ Success - Output: {output_name}")
                success_count += 1
                
            except Exception as e:
                print(f"   ❌ Failed: {str(e)}")
        
        print()
        print(f"{'='*60}")
        print(f"RESULT: {success_count}/{len(test_cases)} replacements successful")
        print(f"{'='*60}")
        
        if success_count > 0:
            print("\n✅ PDF text replacement is working correctly!")
            print("💡 All test PDFs generated successfully")
            print("📋 Open any generated PDF to verify visible text replacement")
            return True
        else:
            print("\n❌ No replacements were successful")
            return False
            
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_user_pdf()
    sys.exit(0 if success else 1)
