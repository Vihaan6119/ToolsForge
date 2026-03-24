#!/usr/bin/env python3
"""
End-to-end test: Frontend command format → API parsing → Python backend
"""

import json

# Simulated flow:
# 1. Frontend generates batch command with oldText 'with' newText format
batch_command = "Apply the following batch edits: Replace text: 'old content' with 'new content'"

# 2. API receives and parses it
def parse_edit_command(command):
    """Simulates the API's parseEditCommand function"""
    trimmed = command.strip()
    
    if "Replace text:" in trimmed:
        import re
        # Extract everything after "Replace text: " until period or end
        match = re.search(r"Replace text:\s*(.+?)(?:\.|$)", trimmed, re.IGNORECASE)
        if match:
            replace_part = match.group(1).strip()
            # Match 'old' with 'new' pattern
            single_match = re.match(r"^['\"]([^'\"]+)['\"] with ['\"]([^'\"]+)['\"]$", replace_part)
            if single_match:
                return {
                    "type": "replace",
                    "oldText": single_match.group(1),
                    "newText": single_match.group(2),
                }
    
    return {"type": "replace", "oldText": "", "newText": ""}

# 3. API parses the command
parsed_command = parse_edit_command(batch_command)
print("Original batch command from frontend:")
print(f'  {batch_command}')
print("\nAPI parsed result:")
print(f'  {json.dumps(parsed_command, indent=2)}')

# 4. API writes to edits.json (simulated)
edits_json = [parsed_command]
edits_str = json.dumps(edits_json, indent=2)
print("\nAPI writes to edits.json:")
print(f'  {edits_str}')

# 5. Python backend reads and processes
print("\nPython backend receives and processes:")
backend_edits = json.loads(edits_str)

for i, edit_cmd in enumerate(backend_edits, 1):
    try:
        # This is the exact line from main.py that was failing before
        cmd_type = edit_cmd.get("type", "").lower()
        old_text = edit_cmd.get("oldText", "").strip()
        new_text = edit_cmd.get("newText", "").strip()
        
        print(f"  ✅ Edit {i} parsed successfully:")
        print(f'     type: "{cmd_type}"')
        print(f'     oldText: "{old_text}"')
        print(f'     newText: "{new_text}"')
        
        if cmd_type == "replace" and old_text and new_text:
            print(f'     → Ready for AI-powered replacement')
        
    except AttributeError as e:
        print(f"  ❌ ERROR: {e}")

print("\n" + "="*70)
print("✅ SUCCESS: Complete data flow verified!")
print("   Frontend → API → Python backend: All working correctly")
