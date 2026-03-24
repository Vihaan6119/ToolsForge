import { useCallback, useState } from "react";

interface PdfEditRequest {
  pdfBase64: string;
  edits: Array<{
    command: string;
  }>;
}

interface PdfEditResponse {
  success: boolean;
  pdfBase64: string;
  editsApplied: number;
}

export function usePdfVectorEdit() {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editPdfWithBackend = useCallback(
    async (pdfBytes: Uint8Array, edits: string[]): Promise<Uint8Array | null> => {
      if (edits.length === 0) {
        return pdfBytes;
      }

      setIsEditing(true);
      setError(null);

      try {
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

        const request: PdfEditRequest = {
          pdfBase64,
          edits: edits.map((command) => ({ command })),
        };

        const response = await fetch("/api/pdf/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.details || errorData.error || "PDF editing failed"
          );
        }

        const data = (await response.json()) as PdfEditResponse;
        if (!data.success) {
          throw new Error("PDF editing returned error");
        }

        // Convert base64 back to Uint8Array
        const outputBytes = Buffer.from(data.pdfBase64, "base64");
        return new Uint8Array(outputBytes);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("PDF editing error:", message);
        return null;
      } finally {
        setIsEditing(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    editPdfWithBackend,
    isEditing,
    error,
    clearError,
  };
}
