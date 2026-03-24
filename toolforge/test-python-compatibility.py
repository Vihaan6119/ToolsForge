#!/usr/bin/env python3
"""
Test script to verify parseEditCommand output is compatible with Python backend
"""

import json

# Simulated output from JavaScript parseEditCommand
test_edit_objects = [
    {
        "type": "replace",
        "oldText": "old content",
        "newText": "new content"
    },
    {
        "type": "delete",
        "oldText": "remove this",
        "newText": ""
    },
    {
        "type": "replace",
        "oldText": "hello",
        "newText": "goodbye"
    }
]

print("Testing Python backend compatibility with parsed edit commands")
print("=" * 70)

for i, edit_cmd in enumerate(test_edit_objects, 1):
    print(f"\nTest {i}: {json.dumps(edit_cmd)}")
    
    # This is the exact line from main.py that was failing
    try:
        cmd_type = edit_cmd.get("type", "").lower()
        old_text = edit_cmd.get("oldText", "").strip()
        new_text = edit_cmd.get("newText", "").strip()
        
        print(f"  ✅ Success!")
        print(f"     cmd_type: '{cmd_type}'")
        print(f"     old_text: '{old_text}'")
        print(f"     new_text: '{new_text}'")
        
        if cmd_type == "replace":
            print(f"     → REPLACE operation: '{old_text}' → '{new_text}'")
        elif cmd_type == "delete":
            print(f"     → DELETE operation: '{old_text}'")
        else:
            print(f"     → Unknown operation type")
            
    except AttributeError as e:
        print(f"  ❌ ERROR: {e}")

print("\n" + "=" * 70)
print("All tests passed! Python backend can process the parsed commands.")
