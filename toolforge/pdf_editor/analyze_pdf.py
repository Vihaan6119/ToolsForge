#!/usr/bin/env python3
"""
PDF Analysis Tool - Extract text and structure from PDFs
Useful for understanding what edits were made to a document
"""

import sys
import os
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF not installed. Install with: pip install pymupdf")
    sys.exit(1)


def analyze_pdf(pdf_path):
    """Extract and analyze PDF content"""
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        return False

    try:
        doc = fitz.open(pdf_path)
        print(f"\n📄 PDF Analysis: {Path(pdf_path).name}")
        print(f"{'=' * 60}")
        print(f"Pages: {doc.page_count}")
        print(f"PDF Version: {doc.metadata['format']}")
        print(f"Author: {doc.metadata.get('author', 'Unknown')}")
        print(f"Title: {doc.metadata.get('title', 'Unknown')}")
        print(f"\n{'=' * 60}")

        for page_num in range(doc.page_count):
            page = doc[page_num]
            text = page.get_text()
            blocks = page.get_text("blocks")

            print(f"\n📖 Page {page_num + 1}:")
            print(f"{'-' * 60}")

            if text.strip():
                print("TEXT CONTENT:")
                print(text[:500])  # First 500 chars
                if len(text) > 500:
                    print(f"... ({len(text) - 500} more characters)")
            else:
                print("(No text found - may be scanned/image-based PDF)")

            print(f"\n📦 Text Blocks Found: {len(blocks)}")
            for i, block in enumerate(blocks[:5]):  # Show first 5 blocks
                if block[4]:  # Has text
                    print(f"  Block {i}: {block[4][:50]}...")

        doc.close()
        print(f"\n{'=' * 60}")
        print("✅ Analysis complete")
        return True

    except Exception as e:
        print(f"❌ Error analyzing PDF: {e}")
        return False


def find_editable_text(pdf_path):
    """Find all text that can be edited (not images)"""
    try:
        doc = fitz.open(pdf_path)
        print(f"\n🔍 Editable Text Found:")
        print(f"{'=' * 60}")

        total_text = ""
        for page_num in range(doc.page_count):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                total_text += text + "\n"

        if total_text.strip():
            # Find specific patterns
            lines = total_text.split("\n")
            print(f"Total Lines: {len(lines)}")
            print(f"\nSample Text Lines:")
            for line in lines[:10]:
                if line.strip():
                    print(f"  - {line.strip()}")

            # Look for common text to replace
            print(f"\nRecommended Edits:")
            if any(year in total_text for year in ["2024", "2025"]):
                print("  ✓ Years (2024/2025) - Can be replaced")
            if any(word in total_text.lower() for word in ["name", "date", "signature"]):
                print("  ✓ Standard fields - Can be replaced")
            if any(word in total_text.lower() for word in ["confidential", "draft"]):
                print("  ✓ Status tags - Can be removed/replaced")
            print("  ✓ Any other text - Select and replace in editor")
        else:
            print("⚠️  No editable text found (PDF may be image-based)")

        doc.close()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        print("PDF Analysis Tool")
        print("Usage: python analyze_pdf.py <path/to/pdf>")
        print("\nSearching for PDFs in current directory...")

        pdf_files = list(Path(".").glob("*.pdf"))
        if pdf_files:
            print(f"Found {len(pdf_files)} PDF file(s):")
            for pdf in pdf_files:
                print(f"  - {pdf}")
            print("\nUsage: python analyze_pdf.py path/to/your.pdf")
        else:
            print("No PDFs found in current directory")
        sys.exit(0)

    success = analyze_pdf(pdf_path)
    if success:
        find_editable_text(pdf_path)
