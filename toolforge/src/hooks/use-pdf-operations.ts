import { useState, useCallback } from "react";

interface PDFOperationOptions {
  operation: "compress" | "optimize" | "encrypt" | "watermark";
  quality?: "low" | "medium" | "high";
  password?: string;
  watermarkText?: string;
}

interface OperationResult {
  success: boolean;
  pdfBase64?: string;
  error?: string;
}

export function usePDFOperations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const processPDF = useCallback(
    async (file: File, options: PDFOperationOptions): Promise<Blob | null> => {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      try {
        // Read file to Base64
        const arrayBuffer = await file.arrayBuffer();
        const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
        setProgress(30);

        // Call API
        const response = await fetch("/api/pdf/operations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfBase64,
            operation: options,
          }),
        });

        setProgress(60);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Operation failed");
        }

        const result = (await response.json()) as OperationResult;
        setProgress(90);

        if (!result.success || !result.pdfBase64) {
          throw new Error(result.error || "No result returned");
        }

        // Convert back to Blob
        const binaryString = Buffer.from(result.pdfBase64, "base64").toString(
          "binary"
        );
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        setProgress(100);
        return new Blob([bytes], { type: "application/pdf" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const downloadPDF = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    processPDF,
    downloadPDF,
    isProcessing,
    error,
    progress,
  };
}
