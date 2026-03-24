#!/usr/bin/env python3
"""
PDF Editor CLI - Main entry point for PDF editing operations
AI-Powered edition using DeepSeek R1 for intelligent text detection and replacement
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Any, List, Dict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from pdf_utils import apply_text_replacement_with_ai
from ai_interface import get_ai_response


def process_edit_command(edit_cmd: Dict[str, Any], pdf_bytes: bytes) -> bytes:
    """
    Process a single edit command using AI-powered text detection
    
    Args:
        edit_cmd: Edit command dictionary with type, oldText, newText, etc.
        pdf_bytes: Current PDF content as bytes
        
    Returns:
        Modified PDF bytes
    """
    cmd_type = edit_cmd.get("type", "").lower()
    
    if cmd_type == "replace":
        old_text = edit_cmd.get("oldText", "").strip()
        new_text = edit_cmd.get("newText", "").strip()
        
        if not old_text:
            print(f"⚠ Skip: Empty oldText in replace command", file=sys.stderr)
            return pdf_bytes
        
        print(f"[EDITS] Replacing: '{old_text[:40]}...' → '{new_text[:40]}...'", file=sys.stderr)
        
        # Use AI-powered replacement
        result_pdf, success = apply_text_replacement_with_ai(
            pdf_bytes, old_text, new_text
        )
        
        if success:
            print(f"[SUCCESS] Text replaced successfully", file=sys.stderr)
        else:
            print(f"[WARNING] Text not found, trying AI-enhanced search...", file=sys.stderr)
            # Fallback: Ask DeepSeek to help find similar text
            help_prompt = f"""I need to find and understand this text in a document: "{old_text}"
This text might be:
- Broken across multiple lines
- Have extra spaces or different formatting
- Be similar but not exact

Provide guidance on what text I should actually look for."""
            ai_guidance = get_ai_response(help_prompt)
            print(f"[AI GUIDANCE] {ai_guidance}", file=sys.stderr)
        
        return result_pdf
    
    elif cmd_type == "delete":
        text_to_delete = edit_cmd.get("text", "").strip()
        if not text_to_delete:
            print(f"⚠ Skip: Empty text in delete command", file=sys.stderr)
            return pdf_bytes
        
        print(f"[EDITS] Deleting: '{text_to_delete[:40]}...'", file=sys.stderr)
        result_pdf, success = apply_text_replacement_with_ai(
            pdf_bytes, text_to_delete, ""
        )
        
        if success:
            print(f"[SUCCESS] Text deleted successfully", file=sys.stderr)
        
        return result_pdf
    
    elif cmd_type == "add":
        new_text = edit_cmd.get("text", "").strip()
        if not new_text:
            print(f"⚠ Skip: Empty text in add command", file=sys.stderr)
            return pdf_bytes
        
        print(f"[EDITS] Adding text: '{new_text[:40]}...'", file=sys.stderr)
        # Note: Adding new text is more complex and may need additional logic
        print(f"[WARNING] Add command not yet fully implemented", file=sys.stderr)
        return pdf_bytes
    
    else:
        print(f"⚠ Unknown command type: {cmd_type}", file=sys.stderr)
        return pdf_bytes


def main():
    """Main entry point for PDF editor CLI"""
    parser = argparse.ArgumentParser(
        description="AI-Powered Vector PDF Editor using DeepSeek R1 and PyMuPDF"
    )
    
    parser.add_argument(
        "--input-pdf",
        required=True,
        type=str,
        help="Path to input PDF file"
    )
    parser.add_argument(
        "--output-pdf",
        required=True,
        type=str,
        help="Path where output PDF will be written"
    )
    parser.add_argument(
        "--edits-file",
        required=True,
        type=str,
        help="Path to JSON file containing array of edit commands"
    )
    
    args = parser.parse_args()
    
    try:
        print(f"[START] Loading PDF from: {args.input_pdf}", file=sys.stderr)
        
        # Read PDF directly from file
        with open(args.input_pdf, 'rb') as f:
            pdf_bytes = f.read()
        print(f"[START] PDF loaded ({len(pdf_bytes)} bytes)", file=sys.stderr)
        
        # Parse edit commands from file
        print(f"[START] Loading edits from: {args.edits_file}", file=sys.stderr)
        with open(args.edits_file, 'r') as f:
            edits = json.load(f)
        print(f"[START] Loaded {len(edits)} edit command(s)", file=sys.stderr)
        
        # Process each edit sequentially
        result_pdf = pdf_bytes
        for i, edit_cmd in enumerate(edits, 1):
            print(f"[{i}/{len(edits)}] Processing edit command...", file=sys.stderr)
            result_pdf = process_edit_command(edit_cmd, result_pdf)
        
        # Write output PDF directly to file
        print(f"[SAVE] Writing output PDF to: {args.output_pdf}", file=sys.stderr)
        with open(args.output_pdf, 'wb') as f:
            f.write(result_pdf)
        print(f"[SAVE] PDF written ({len(result_pdf)} bytes)", file=sys.stderr)
        
        print(f"[COMPLETE] ✓ PDF processing completed successfully", file=sys.stderr)
        sys.exit(0)
        
    except FileNotFoundError as e:
        print(f"[ERROR] File not found: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON in edits file: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] PDF processing failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
