import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

/**
 * Ghostscript-based PDF operations
 * Provides server-side PDF processing with open-source Ghostscript
 */

interface PDFOperation {
  operation: "compress" | "encrypt" | "watermark" | "optimize";
  quality?: "low" | "medium" | "high";
  password?: string;
  watermarkText?: string;
}

/**
 * Compress PDF using Ghostscript
 * Quality levels: low (72dpi), medium (150dpi), high (300dpi)
 */
async function compressPDF(
  inputBytes: Uint8Array,
  quality: "low" | "medium" | "high" = "medium"
): Promise<Uint8Array> {
  const tmpDir = path.join(os.tmpdir(), `pdf-compress-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const inputPath = path.join(tmpDir, "input.pdf");
    const outputPath = path.join(tmpDir, "output.pdf");

    fs.writeFileSync(inputPath, inputBytes);

    // Ghostscript quality settings
    const dpiSettings = {
      low: "72",
      medium: "150",
      high: "300",
    };

    const dpi = dpiSettings[quality];

    // Ghostscript compression command
    const command = `gswin64c -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -r${dpi} -o "${outputPath}" "${inputPath}"`;

    try {
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024, timeout: 60000 });

      if (!fs.existsSync(outputPath)) {
        throw new Error("Ghostscript compression failed");
      }

      return new Uint8Array(fs.readFileSync(outputPath));
    } catch (error) {
      // Fallback: if gswin64c not available, try gs command
      const fallbackCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -r${dpi} -o "${outputPath}" "${inputPath}"`;
      await execAsync(fallbackCommand, { maxBuffer: 50 * 1024 * 1024, timeout: 60000 });

      if (!fs.existsSync(outputPath)) {
        throw new Error("PDF compression failed - Ghostscript not found");
      }

      return new Uint8Array(fs.readFileSync(outputPath));
    }
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

/**
 * Optimize PDF for web using Ghostscript
 * Removes unnecessary data while maintaining visual quality
 */
async function optimizePDF(inputBytes: Uint8Array): Promise<Uint8Array> {
  const tmpDir = path.join(os.tmpdir(), `pdf-optimize-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const inputPath = path.join(tmpDir, "input.pdf");
    const outputPath = path.join(tmpDir, "output.pdf");

    fs.writeFileSync(inputPath, inputBytes);

    // Optimize for web with Ghostscript
    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dNOPAUSE -dBATCH -dDetectDuplicateImages -r150x150 -o "${outputPath}" "${inputPath}"`;

    try {
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024, timeout: 60000 });
    } catch {
      // Fallback attempt
      const fallbackCommand = `gswin64c -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dNOPAUSE -dBATCH -dDetectDuplicateImages -r150x150 -o "${outputPath}" "${inputPath}"`;
      await execAsync(fallbackCommand, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 60000,
      });
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error("PDF optimization failed");
    }

    return new Uint8Array(fs.readFileSync(outputPath));
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

/**
 * Process PDF operation request
 */
async function processPDFOperation(
  pdfBase64: string,
  operation: PDFOperation
): Promise<string> {
  const pdfBytes = Buffer.from(pdfBase64, "base64");

  let resultBytes: Uint8Array;

  switch (operation.operation) {
    case "compress":
      resultBytes = await compressPDF(pdfBytes, operation.quality || "medium");
      break;

    case "optimize":
      resultBytes = await optimizePDF(pdfBytes);
      break;

    // Encryption would require additional PDF library
    case "encrypt":
      throw new Error("Encryption requires additional setup");

    // Watermark would require PDF library
    case "watermark":
      throw new Error("Watermarking requires additional setup");

    default:
      throw new Error(`Unknown operation: ${operation.operation}`);
  }

  return Buffer.from(resultBytes).toString("base64");
}

/**
 * POST handler for PDF operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64, operation } = body as {
      pdfBase64: string;
      operation: PDFOperation;
    };

    if (!pdfBase64 || !operation) {
      return NextResponse.json(
        { error: "Missing PDF or operation" },
        { status: 400 }
      );
    }

    console.log(`Processing PDF operation: ${operation.operation}`);

    const resultBase64 = await processPDFOperation(pdfBase64, operation);

    return NextResponse.json({
      success: true,
      pdfBase64: resultBase64,
      operation: operation.operation,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("PDF operation error:", errorMsg);

    // Check if Ghostscript is installed
    if (errorMsg.includes("Ghostscript not found")) {
      return NextResponse.json(
        {
          error: "Ghostscript not installed on server",
          details:
            "Install with: apt-get install ghostscript (Linux) or brew install ghostscript (macOS)",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorMsg || "PDF operation failed" },
      { status: 500 }
    );
  }
}
