import type { PdfEditorAnnotation } from "@/app/tools/pdf-editor/types";

/**
 * Converts visual annotations into natural language commands
 * that the DeepSeek-powered Python backend can understand
 */
export function annotationsToEditCommands(
  annotations: PdfEditorAnnotation[]
): string[] {
  const commands: string[] = [];

  // Group by type for efficient processing
  const replaceCommands = annotations.filter((a) => a.kind === "replace-text");
  const addCommands = annotations.filter((a) => a.kind === "text");

  // Process replacements (highest priority for accuracy)
  for (const annotation of replaceCommands) {
    if (annotation.kind === "replace-text" && annotation.text && annotation.replaceBox) {
      const pageNum = annotation.pageIndex;
      // Command format: "Change 'original_text' to 'new_text' on page X"
      // The Python backend will use OCR/text detection if original_text is ambiguous
      commands.push(
        `Change '${escapeQuotes(annotation.text)}' on page ${pageNum}`
      );
    }
  }

  // Process additions
  for (const annotation of addCommands) {
    if (annotation.kind === "text") {
      const pageNum = annotation.pageIndex;
      const x = Math.round(annotation.point.x);
      const y = Math.round(annotation.point.y);
      commands.push(
        `Add '${escapeQuotes(annotation.text)}' at position (${x}, ${y}) on page ${pageNum}`
      );
    }
  }

  return commands;
}

/**
 * Escape special characters in quoted strings
 */
function escapeQuotes(text: string): string {
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Convert annotations to optimized batch command
 * Uses compound instructions for better DeepSeek interpretation
 */
export function annotationsToOptimizedCommand(
  annotations: PdfEditorAnnotation[]
): string {
  const replaceAnnotations = annotations.filter((a) => a.kind === "replace-text");
  const addCount = annotations.filter((a) => a.kind === "text").length;

  const parts: string[] = [];

  if (replaceAnnotations.length > 0) {
    // Build replace commands with both old and new text
    const replacements = replaceAnnotations
      .map((a) => {
        const oldText = a.oldText || "";
        const newText = escapeQuotes(a.text);
        return `'${escapeQuotes(oldText)}' with '${newText}'`;
      })
      .join(", ");
    parts.push(`Replace text: ${replacements}`);
  }

  if (addCount > 0) {
    parts.push(`Add ${addCount} text element(s)`);
  }

  return parts.length > 0
    ? `Apply the following batch edits: ${parts.join(". ")}`
    : "No edits to apply";
}
