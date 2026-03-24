// Test the updated parseEditCommand with new format including oldText

function parseEditCommand(command) {
  const trimmed = command.trim();

  // Try to match "Replace text: 'old1' with 'new1', 'old2' with 'new2'" format from batch edits
  if (trimmed.includes("Replace text:")) {
    const replaceMatch = trimmed.match(
      /Replace text:\s*(.+?)(?:\.|$)/i
    );
    
    if (replaceMatch) {
      const replacePart = replaceMatch[1].trim();
      
      // Try to match "single replacement with quotes" pattern: 'old' with 'new'
      const singleMatch = replacePart.match(
        /^['"]([^'"]+)['"]\s+with\s+['"]([^'"]+)['"]$/
      );
      
      if (singleMatch) {
        return {
          type: "replace",
          oldText: singleMatch[1],
          newText: singleMatch[2],
        };
      }

      // Try to handle the first of multiple replacements
      const firstMatch = replacePart.match(
        /^['"]([^'"]+)['"]\s+with\s+['"]([^'"]+)['"]/
      );
      
      if (firstMatch) {
        return {
          type: "replace",
          oldText: firstMatch[1],
          newText: firstMatch[2],
        };
      }
    }
  }

  // Fallback: match simpler "Replace 'old' with 'new'" format
  const simplReplaceMatch = trimmed.match(
    /Replace\s+['"]([^'"]+)['"]\s+with\s+['"]([^'"]+)['"]/i
  );
  if (simplReplaceMatch) {
    return {
      type: "replace",
      oldText: simplReplaceMatch[1],
      newText: simplReplaceMatch[2],
    };
  }

  // Try to extract "Delete text: 'text'" from batch commands
  const deleteMatch = trimmed.match(
    /Delete\s+text:\s*['"]([^'"]+)['"]/i
  );
  if (deleteMatch) {
    return {
      type: "delete",
      oldText: deleteMatch[1],
      newText: "",
    };
  }

  // Fallback: match simpler "Delete 'text'" format
  const simplDeleteMatch = trimmed.match(
    /Delete\s+['"]([^'"]+)['"]/i
  );
  if (simplDeleteMatch) {
    return {
      type: "delete",
      oldText: simplDeleteMatch[1],
      newText: "",
    };
  }

  console.warn(`[PARSE] Could not parse command: ${trimmed.substring(0, 80)}`);
  return {
    type: "replace",
    oldText: "",
    newText: "",
  };
}

// Test cases with NEW format that includes oldText
const testCases = [
  // New format with oldText: 'old' with 'new'
  "Apply the following batch edits: Replace text: 'old content' with 'new content'",
  "Replace text: 'legacy code' with 'modern implementation'",
  
  // Multiple replacements
  "Apply the following batch edits: Replace text: 'first old' with 'first new', 'second old' with 'second new'",
  
  // Delete commands
  "Apply the following batch edits: Delete text: 'obsolete code'. Add 2 text element(s)",
  "Delete 'remove me'",
  
  // Simple formats
  "Replace 'hello' with 'goodbye'",
];

console.log("Testing updated parseEditCommand with oldText format:");
console.log("=" .repeat(70));

testCases.forEach((cmd, i) => {
  const result = parseEditCommand(cmd);
  console.log(`\nTest ${i + 1}: "${cmd.substring(0, 60)}${cmd.length > 60 ? '...' : ''}"`);
  console.log(`Result:`, JSON.stringify(result, null, 2));
  
  if (!result.type) {
    console.log("❌ ERROR: Missing 'type' property!");
  } else if (result.type === "replace" && !result.oldText) {
    console.log("⚠️  WARNING: Replace command missing oldText");
  } else {
    console.log(`✅ Valid: type='${result.type}', oldText='${result.oldText || '(empty)'}', newText='${result.newText || '(empty)'}'`);
  }
});

console.log("\n" + "=" .repeat(70));
console.log("All tests completed!");
