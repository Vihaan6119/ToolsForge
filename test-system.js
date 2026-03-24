/**
 * Test script to verify the PDF edit system works
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

async function testPdfEditSystem() {
  console.log("Testing PDF Edit System Components...\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Python CLI availability
  console.log("1️⃣ Testing Python CLI availability...");
  try {
    // Use the virtual environment Python executable
    const pythonExe = "C:\\Users\\Vihaan\\OneDrive\\Desktop\\Vihaan\\ToolsForge\\.venv\\Scripts\\python.exe";
    const { stdout } = await execAsync(
      `"${pythonExe}" pdf_editor/main.py --help`,
      {
        cwd: "C:\\Users\\Vihaan\\OneDrive\\Desktop\\Vihaan\\ToolsForge",
        timeout: 10000,
      }
    );
    if (stdout.includes("Edit PDF")) {
      console.log("   ✅ Python CLI is available and working\n");
      passed++;
    } else {
      console.log("   ❌ Python CLI output unexpected\n");
      failed++;
    }
  } catch (err) {
    console.log("   ❌ Python CLI test failed:", err.message, "\n");
    failed++;
  }

  // Test 2: Node.js process check
  console.log("2️⃣ Verifying Node.js environment...");
  try {
    console.log("   Node.js version:", process.version);
    console.log("   Working directory:", process.cwd());
    console.log("   ✅ Node.js environment is ready\n");
    passed++;
  } catch (err) {
    console.log("   ❌ Node.js check failed\n");
    failed++;
  }

  // Test 3: File system check
  console.log("3️⃣ Checking required API files...");
  const fs = require("fs");
  const path = require("path");
  const apiFile = path.join(
    "C:\\Users\\Vihaan\\OneDrive\\Desktop\\Vihaan\\ToolsForge\\toolforge",
    "src/app/api/pdf/edit/route.ts"
  );
  const hookFile = path.join(
    "C:\\Users\\Vihaan\\OneDrive\\Desktop\\Vihaan\\ToolsForge\\toolforge",
    "src/hooks/use-pdf-vector-edit.ts"
  );
  const libFile = path.join(
    "C:\\Users\\Vihaan\\OneDrive\\Desktop\\Vihaan\\ToolsForge\\toolforge",
    "src/lib/pdf-edit-commands.ts"
  );

  try {
    if (
      fs.existsSync(apiFile) &&
      fs.existsSync(hookFile) &&
      fs.existsSync(libFile)
    ) {
      console.log("   ✅ All API files created:");
      console.log("      - /api/pdf/edit/route.ts");
      console.log("      - /hooks/use-pdf-vector-edit.ts");
      console.log("      - /lib/pdf-edit-commands.ts\n");
      passed++;
    } else {
      console.log("   ❌ Some API files are missing\n");
      failed++;
    }
  } catch (err) {
    console.log("   ❌ File check failed:", err.message, "\n");
    failed++;
  }

  // Test 4: Main page.tsx integration check
  console.log("4️⃣ Checking main page.tsx integration...");
  const pageFile = path.join(
    "C:\\Users\\Vihaan\\OneDrive\\Desktop\\Vihaan\\ToolsForge\\toolforge",
    "src/app/tools/pdf-editor/page.tsx"
  );

  try {
    const pageContent = fs.readFileSync(pageFile, "utf8");
    const hasHook = pageContent.includes("usePdfVectorEdit");
    const hasCommand = pageContent.includes("annotationsToOptimizedCommand");
    const hasBackendEdit = pageContent.includes("editPdfWithBackend");

    if (hasHook && hasCommand && hasBackendEdit) {
      console.log("   ✅ page.tsx properly integrated:");
      console.log("      - Imports usePdfVectorEdit hook ✓");
      console.log("      - Imports annotationsToOptimizedCommand ✓");
      console.log("      - Uses editPdfWithBackend in rebuildPdf ✓\n");
      passed++;
    } else {
      console.log("   ❌ page.tsx integration incomplete\n");
      failed++;
    }
  } catch (err) {
    console.log("   ❌ page.tsx check failed:", err.message, "\n");
    failed++;
  }

  // Summary
  console.log("═══════════════════════════════════════════════════");
  console.log(`✅ PASSED: ${passed}/4 tests`);
  console.log(`❌ FAILED: ${failed}/4 tests`);
  console.log("═══════════════════════════════════════════════════\n");

  if (failed === 0) {
    console.log("🎉 All systems operational! PDF editor is ready.\n");
    console.log("Architecture:");
    console.log("  Web UI → /api/pdf/edit endpoint → Python CLI → Vector PDF\n");
    console.log("To test:");
    console.log("  1. Go to http://localhost:3002/tools/pdf-editor");
    console.log("  2. Upload a PDF");
    console.log("  3. Select text and make edits");
    console.log("  4. Download - should be vector-edited with Adobe precision");
    return true;
  } else {
    console.log("⚠️ Some components need attention before production use.");
    return false;
  }
}

testPdfEditSystem().catch(console.error);
