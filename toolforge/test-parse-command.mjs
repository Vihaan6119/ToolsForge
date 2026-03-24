// Test script for parseEditCommand function

function parseEditCommand(command) {
  const trimmed = command.trim();

  // Match "Replace text: 'old' with 'new'" or "Replace 'old' with 'new'"
  const replaceMatch = trimmed.match(
    /Replace\s+(?:text:\s*)?['"]([^'"]+)['"]\s+(?:with\s+)?['"]([^'"]+)['"]/i
  );
  if (replaceMatch) {
    return {
      type: "replace",
      oldText: replaceMatch[1],
      newText: replaceMatch[2],
    };
  }

  // Match "Delete text: 'text'" or "Delete 'text'"
  const deleteMatch = trimmed.match(
    /Delete\s+(?:text:\s*)?['"]([^'"]+)['"]/i
  );
  if (deleteMatch) {
    return {
      type: "delete",
      oldText: deleteMatch[1],
      newText: "",
    };
  }

  // If we can't parse, return as a generic replace command
  return {
    type: "replace",
    oldText: command,
    newText: command,
  };
}

// Test cases
const testCases = [
  "Replace text: 'old content' with 'new content'",
  "Replace 'hello' with 'goodbye'",
  "Delete text: 'remove this'",
  "Delete 'obsolete'",
  "Apply the following batch edits: Replace text: 'old' with 'new'. Add 2 text element(s)",
];

console.log("Testing parseEditCommand:");
console.log("=".repeat(60));

testCases.forEach((cmd, i) => {
  const result = parseEditCommand(cmd);
  console.log(`\nTest ${i + 1}: "${cmd.substring(0, 50)}..."`);
  console.log(`Result:`, JSON.stringify(result, null, 2));
  
  // Verify it has required 'type' property for Python backend
  if (!result.type) {
    console.log("❌ ERROR: Missing 'type' property!");
  } else {
    console.log(`✅ Has 'type' property: "${result.type}"`);
  }
});

console.log("\n" + "=".repeat(60));
console.log("All tests completed!");
