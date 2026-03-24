#!/usr/bin/env python3
"""
Validation Script - Verify AI-Powered PDF Editor is Ready
Checks all components: Python, Ollama, API, and AI integration
"""

import subprocess
import sys
import json
import requests
from pathlib import Path


def check_section(name: str):
    print(f"\n{'='*60}")
    print(f"🔍 {name}")
    print(f"{'='*60}")


def run_check(description: str, command: list) -> bool:
    """Run a check and return success/failure"""
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print(f"✅ {description}")
            return True
        else:
            print(f"❌ {description}")
            if result.stderr:
                print(f"   Error: {result.stderr[:100]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"⏱️  {description} (timeout)")
        return False
    except Exception as e:
        print(f"❌ {description}")
        print(f"   Error: {str(e)[:100]}")
        return False


def check_ollama():
    """Check if Ollama is running and DeepSeek is available"""
    check_section("Ollama & DeepSeek Verification")
    
    # Check if service is running
    try:
        response = requests.get("http://localhost:11434/api/version", timeout=2)
        if response.status_code == 200:
            print("✅ Ollama service is running on localhost:11434")
        else:
            print(f"❌ Ollama service returned status {response.status_code}")
            return False
    except requests.ConnectionError:
        print("❌ Ollama service not running")
        print("   Run: ollama serve")
        return False
    except Exception as e:
        print(f"⚠️  Could not connect to Ollama: {str(e)}")
        return False
    
    # Check if DeepSeek model is available
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "deepseek-r1" in result.stdout:
            print("✅ DeepSeek R1:1.5b model is installed")
            return True
        else:
            print("❌ DeepSeek R1:1.5b model not found")
            print("   Install with: ollama pull deepseek-r1:1.5b")
            return False
    except Exception as e:
        print(f"⚠️  Could not check models: {str(e)}")
        return False


def check_python():
    """Check Python environment and dependencies"""
    check_section("Python Environment Check")
    
    checks = [
        (["python", "--version"], "Python installed"),
        (["python", "-c", "import fitz; print('PyMuPDF', fitz.__version__)"], "PyMuPDF installed"),
        (["python", "-c", "import requests; print('requests OK')"], "requests library"),
        (["python", "-c", "import json; print('json OK')"], "json library"),
    ]
    
    all_passed = True
    for cmd, desc in checks:
        if not run_check(desc, cmd):
            all_passed = False
    
    return all_passed


def check_project_files():
    """Check if all required project files exist"""
    check_section("Project Files Check")
    
    required_files = [
        "toolforge/pdf_editor/main.py",
        "toolforge/pdf_editor/pdf_utils.py",
        "toolforge/pdf_editor/ai_interface.py",
        "toolforge/src/app/api/pdf/edit/route.ts",
        "toolforge/src/hooks/use-pdf-vector-edit.ts",
        ".venv/Scripts/python.exe",
    ]
    
    base_path = Path(__file__).parent.parent
    all_exist = True
    
    for file_path in required_files:
        full_path = base_path / file_path
        exists = full_path.exists()
        status = "✅" if exists else "❌"
        print(f"{status} {file_path}")
        if not exists:
            all_exist = False
    
    return all_exist


def check_ai_features():
    """Check if AI-powered features are in the code"""
    check_section("AI Features Implementation Check")
    
    checks = [
        ("toolforge/pdf_editor/pdf_utils.py", "find_best_text_match"),
        ("toolforge/pdf_editor/pdf_utils.py", "apply_text_replacement_with_ai"),
        ("toolforge/pdf_editor/ai_interface.py", "get_ai_response"),
        ("toolforge/pdf_editor/main.py", "process_edit_command"),
    ]
    
    base_path = Path(__file__).parent.parent
    all_found = True
    
    for file_path, function_name in checks:
        full_path = base_path / file_path
        if full_path.exists():
            content = full_path.read_text()
            if function_name in content:
                print(f"✅ {function_name} found in {Path(file_path).name}")
            else:
                print(f"❌ {function_name} NOT found in {Path(file_path).name}")
                all_found = False
        else:
            print(f"❌ File not found: {file_path}")
            all_found = False
    
    return all_found


def main():
    """Run all validation checks"""
    print("\n" + "="*60)
    print("🤖 AI-Powered PDF Editor - Validation Script")
    print("="*60)
    
    results = {
        "Ollama & DeepSeek": check_ollama(),
        "Python Environment": check_python(),
        "Project Files": check_project_files(),
        "AI Features": check_ai_features(),
    }
    
    # Summary
    print("\n" + "="*60)
    print("📊 Validation Summary")
    print("="*60)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    for check_name, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {check_name}")
    
    print(f"\nResult: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 All systems are ready!")
        print("\nNext steps:")
        print("1. Ensure Ollama is running: ollama serve")
        print("2. Start dev server: cd toolforge && npx next dev -p 3001")
        print("3. Open http://localhost:3001/tools/pdf-editor")
        print("4. Upload your PDF and edit text with AI assistance")
        return 0
    else:
        print(f"\n⚠️  {total - passed} checks failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
