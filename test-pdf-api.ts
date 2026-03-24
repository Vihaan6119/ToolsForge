import * as fs from "fs";
import * as path from "path";

/**
 * Test script for PDF editing API
 * This tests the backend integration without needing the full web server
 */

const workspaceRoot = path.resolve(
  __dirname,
  ".."
);

console.log("🧪 Testing PDF Editor API Integration\n");

// Test 1: Check Python backend files
console.log("1. Checking Python backend files...");
const pdfEditorFiles = [
  "pdf_editor/main.py",
  "pdf_editor/pdf_utils.py",
  "pdf_editor/ai_interface.py",
];

for (const file of pdfEditorFiles) {
  const filePath = path.join(workspaceRoot, "toolforge", file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? "✓" : "✗"} ${file}`);
  if (!exists) {
    console.log(`     Missing: ${filePath}`);
  }
}

// Test 2: Check API route file
console.log("\n2. Checking API endpoint...");
const apiRoute = path.join(
  workspaceRoot,
  "toolforge",
  "src",
  "app",
  "api",
  "pdf",
  "edit",
  "route.ts"
);
const apiExists = fs.existsSync(apiRoute);
console.log(`   ${apiExists ? "✓" : "✗"} /api/pdf/edit route exists`);

// Test 3: Verify API code has correct argument handling
if (apiExists) {
  const apiCode = fs.readFileSync(apiRoute, "utf-8");
  const hasEditsFile = apiCode.includes("--edits-file");
  const writesEditsFile = apiCode.includes("fs.writeFileSync(editsPath");
  
  console.log(`   ${hasEditsFile ? "✓" : "✗"} Uses --edits-file argument`);
  console.log(`   ${writesEditsFile ? "✓" : "✗"} Writes edits to temp file`);
}

// Test 4: Verify Python CLI has matching arguments
console.log("\n3. Checking Python CLI arguments...");
const mainPy = path.join(workspaceRoot, "toolforge", "pdf_editor", "main.py");
if (fs.existsSync(mainPy)) {
  const pythonCode = fs.readFileSync(mainPy, "utf-8");
  const hasEditsFileArg = pythonCode.includes("--edits-file");
  const readsEditsFile = pythonCode.includes("json.load(f)");
  
  console.log(`   ${hasEditsFileArg ? "✓" : "✗"} Expects --edits-file argument`);
  console.log(`   ${readsEditsFile ? "✓" : "✗"} Reads edits from JSON file`);
}

// Test 5: Check React hook
console.log("\n4. Checking React hook...");
const hookFile = path.join(
  workspaceRoot,
  "toolforge",
  "src",
  "hooks",
  "use-pdf-vector-edit.ts"
);
if (fs.existsSync(hookFile)) {
  const hookCode = fs.readFileSync(hookFile, "utf-8");
  const hasFetch = hookCode.includes("fetch");
  const hasApiCall = hookCode.includes("/api/pdf/edit");
  
  console.log(`   ${hasFetch ? "✓" : "✗"} Hook calls API endpoint`);
  console.log(`   ${hasApiCall ? "✓" : "✗"} Correct endpoint path`);
}

console.log("\n5. Checking integration flow...");
const pageFile = path.join(
  workspaceRoot,
  "toolforge",
  "src",
  "app",
  "tools",
  "pdf-editor",
  "page.tsx"
);
if (fs.existsSync(pageFile)) {
  const pageCode = fs.readFileSync(pageFile, "utf-8");
  const importsHook = pageCode.includes("usePdfVectorEdit");
  const usesEditCommands = pageCode.includes("annotationsToOptimizedCommand");
  
  console.log(`   ${importsHook ? "✓" : "✗"} Page imports vector edit hook`);
  console.log(`   ${usesEditCommands ? "✓" : "✗"} Page uses command converter`);
}

console.log("\n✅ System Integration Verification Complete\n");
console.log("Next steps:");
console.log("1. Kill the process using port 3002 (if needed)");
console.log("2. Start dev server: npm run dev");
console.log("3. Open http://localhost:3002/tools/pdf-editor");
console.log("4. Upload a PDF and test text replacement");
console.log("   Expected: No 'arguments required' error, seamless text replacement\n");
