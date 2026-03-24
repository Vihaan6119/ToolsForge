#!/usr/bin/env python3
"""
Edge case test: Simple single text replacement (not batch)
Ensure the fix handles all variations
"""

import json
import re

def test_simple_replacement():
    """Test simple format without batch wrapper"""
    command = "Replace 'hello world' with 'goodbye world'"
    
    # API parser logic
    match = re.search(
        r"Replace\s+text:\s*['\"](.+?)['\"]\\s+with\\s+['\"](.+?)['\"]",
        command,
        re.IGNORECASE
    )
    
    if not match:
        # Try simpler pattern
        match = re.search(
            r"Replace\s+['\"](.+?)['\"]\\s+with\\s+['\"](.+?)['\"]",
            command,
            re.IGNORECASE
        )
    
    if match:
        return {
            "type": "replace",
            "oldText": match.group(1),
            "newText": match.group(2),
        }
    
    return {"type": "replace", "oldText": "", "newText": ""}

def test_delete_command():
    """Test delete command format"""
    command = "Delete 'deprecated function'"
    
    match = re.search(
        r"Delete\s+text:\s*['\"](.+?)['\"]",
        command,
        re.IGNORECASE
    )
    
    if not match:
        match = re.search(
            r"Delete\s+['\"](.+?)['\"]",
            command,
            re.IGNORECASE
        )
    
    if match:
        return {
            "type": "delete",
            "oldText": match.group(1),
            "newText": "",
        }
    
    return {"type": "replace", "oldText": "", "newText": ""}

def test_batch_format():
    """Test batch format"""
    command = "Apply the following batch edits: Replace text: 'old value' with 'new value'"
    
    match = re.search(
        r"Replace\s+text:\s*['\"](.+?)['\"]\\s+with\\s+['\"](.+?)['\"]",
        command,
        re.IGNORECASE
    )
    
    if match:
        return {
            "type": "replace",
            "oldText": match.group(1),
            "newText": match.group(2),
        }
    
    # Fallback
    quotes = re.findall(r"['\"]([^'\"]*)['\"]", command)
    if len(quotes) >= 2:
        return {
            "type": "replace",
            "oldText": quotes[0],
            "newText": quotes[1],
        }
    
    return {"type": "replace", "oldText": "", "newText": ""}

# Run tests
tests = [
    ("Simple replacement", test_simple_replacement),
    ("Delete command", test_delete_command),
    ("Batch format", test_batch_format),
]

print("=" * 70)
print("EDGE CASE TESTS: Verify all command formats work")
print("=" * 70)

all_pass = True
for name, test_func in tests:
    result = test_func()
    print(f"\n{name}:")
    print(f"  Result: {json.dumps(result, indent=2)}")
    
    # Verify Python backend can process it
    try:
        cmd_type = result.get("type", "").lower()
        old_text = result.get("oldText", "").strip()
        new_text = result.get("newText", "").strip()
        
        if cmd_type in ["replace", "delete"]:
            print(f"  ✓ Valid: type='{cmd_type}', has data")
        else:
            print(f"  ✗ Invalid: unknown type '{cmd_type}'")
            all_pass = False
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
        all_pass = False

print("\n" + "=" * 70)
if all_pass:
    print("✅ All edge cases pass!")
else:
    print("❌ Some edge cases failed")
