import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

/**
 * Path to the Python executable in virtual environment
 * This ensures all installed packages (PyMuPDF, ollama) are available
 */
const PYTHON_EXECUTABLE = path.resolve(
  process.cwd(),
  "..",
  ".venv",
  "Scripts",
  "python.exe"
);

/**
 * Parse a natural language edit command string into a structured edit object
 * Supports batch edit formats like: "Replace text: 'old1' with 'new1', 'old2' with 'new2'"
 * Also supports standalone formats: "Replace 'old' with 'new'"
 */
function parseEditCommand(command: string): Record<string, unknown> {
  const trimmed = command.trim();

  // Pattern: Replace text: 'old content' with 'new content'
  // This uses a more flexible regex that handles content within quotes
  const replaceMatch = trimmed.match(
    /Replace\s+text:\s*['"](.*?)['"]\s+with\s+['"](.*?)['"]/i
  );
  
  if (replaceMatch) {
    return {
      type: "replace",
      oldText: replaceMatch[1],
      newText: replaceMatch[2],
    };
  }

  // Try to match multiple replacements (take the first one for now)
  // Pattern: Replace text: 'old1' with 'new1', 'old2' with 'new2'
  const multiMatch = trimmed.match(
    /Replace\s+text:\s*['"](.+?)['"]\s+with\s+['"](.+?)['"]/
  );
  
  if (multiMatch) {
    return {
      type: "replace",
      oldText: multiMatch[1],
      newText: multiMatch[2],
    };
  }

  // Fallback: match simpler "Replace 'old' with 'new'" format without "text:" prefix
  const simplReplaceMatch = trimmed.match(
    /Replace\s+['"](.+?)['"]\s+with\s+['"](.+?)['"]/i
  );
  if (simplReplaceMatch) {
    return {
      type: "replace",
      oldText: simplReplaceMatch[1],
      newText: simplReplaceMatch[2],
    };
  }

  // Try to extract "Delete text: 'text'"
  const deleteMatch = trimmed.match(
    /Delete\s+text:\s*['"](.+?)['"]/i
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
    /Delete\s+['"](.+?)['"]/i
  );
  if (simplDeleteMatch) {
    return {
      type: "delete",
      oldText: simplDeleteMatch[1],
      newText: "",
    };
  }

  // If we can't parse, log and return empty replacement
  console.warn(`[PARSE] Could not parse command: ${trimmed.substring(0, 80)}`);
  return {
    type: "replace",
    oldText: "",
    newText: "",
  };
}

/**
 * PDF Edit API - Vector-based replacement using Python backend
 * This endpoint delegates to the DeepSeek-powered Python PDF engine
 * for Adobe-level precision editing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64, edits } = body as {
      pdfBase64: string;
      edits: Array<{ command: string }>;
    };

    if (!pdfBase64 || !edits || edits.length === 0) {
      return NextResponse.json(
        { error: "Missing PDF or edits" },
        { status: 400 }
      );
    }

    // Create temporary directory for processing
    const tmpDir = path.join(os.tmpdir(), `pdf-edit-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Write input PDF
      const inputPath = path.join(tmpDir, "input.pdf");
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      fs.writeFileSync(inputPath, pdfBuffer);

      const outputPath = path.join(tmpDir, "output.pdf");
      const editsPath = path.join(tmpDir, "edits.json");

      // Parse commands into structured edit objects
      const editsJson = edits.map((e) => parseEditCommand(e.command));
      fs.writeFileSync(editsPath, JSON.stringify(editsJson, null, 2));

      // Build command with file paths
      const command = `"${PYTHON_EXECUTABLE}" "${path.join(
        process.cwd(),
        "pdf_editor/main.py"
      )}" --input-pdf "${inputPath}" --output-pdf "${outputPath}" --edits-file "${editsPath}"`;

      console.log(`Executing PDF edits`);

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large PDFs
          timeout: 60000, // 60 second timeout for all edits
        });

        if (stdout) console.log("Python output:", stdout);
        if (stderr) console.log("Python stderr:", stderr);
      } catch (execError) {
        const error = execError as Record<string, unknown>;
        console.error("Python execution error:", error.message || String(error));
        return NextResponse.json(
          {
            error: "PDF editing failed",
            details: error.stderr || error.message,
          },
          { status: 500 }
        );
      }

      // Read final output
      if (!fs.existsSync(outputPath)) {
        return NextResponse.json(
          { error: "Output PDF not generated" },
          { status: 500 }
        );
      }

      const outputBuffer = fs.readFileSync(outputPath);
      const outputBase64 = outputBuffer.toString("base64");

      return NextResponse.json({
        success: true,
        pdfBase64: outputBase64,
        editsApplied: edits.length,
      });
    } finally {
      // Cleanup temporary files
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("API error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg || "Internal server error" },
      { status: 500 }
    );
  }
}
