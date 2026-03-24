"use client";

import React, { useState, useRef, useCallback } from "react";
import { FileText, Download, Upload, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { usePDFOperations } from "@/hooks/use-pdf-operations";

interface PDFTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  enabled: boolean;
}

export default function AdvancedPdfEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processPDF, downloadPDF, isProcessing, error, progress } = usePDFOperations();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile?.type === "application/pdf") {
      setFile(uploadedFile);
      setStatusMessage(null);
    }
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setStatusMessage("Compressing PDF...");
    const result = await processPDF(file, {
      operation: "compress",
      quality: "medium",
    });
    if (result) {
      downloadPDF(result, `${file.name.replace(".pdf", "")}-compressed.pdf`);
      setStatusMessage("✓ PDF compressed successfully");
    } else {
      setStatusMessage(null);
    }
  }, [file, processPDF, downloadPDF]);

  const handleOptimize = useCallback(async () => {
    if (!file) return;
    setStatusMessage("Optimizing PDF for web...");
    const result = await processPDF(file, { operation: "optimize" });
    if (result) {
      downloadPDF(result, `${file.name.replace(".pdf", "")}-optimized.pdf`);
      setStatusMessage("✓ PDF optimized successfully");
    } else {
      setStatusMessage(null);
    }
  }, [file, processPDF, downloadPDF]);

  const tools: PDFTool[] = [
    {
      id: "compress",
      name: "Compress PDF",
      description: "Reduce file size while maintaining quality (50-70% smaller)",
      icon: <Zap className="w-6 h-6" />,
      action: handleCompress,
      enabled: !!file && !isProcessing,
    },
    {
      id: "optimize",
      name: "Optimize for Web",
      description: "Optimize for faster loading on websites",
      icon: <Upload className="w-6 h-6" />,
      action: handleOptimize,
      enabled: !!file && !isProcessing,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Advanced PDF Editor</h1>
        </div>
        <p className="text-gray-600">
          Open-source PDF editor powered by Ghostscript (gswin64c)
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-8">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition",
            file
              ? "border-green-500 bg-green-50"
              : "border-blue-300 bg-blue-50 hover:border-blue-400"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          {file ? (
            <div className="text-green-700">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <p className="font-semibold">{file.name}</p>
              <p className="text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="text-blue-700">
              <Upload className="w-12 h-12 mx-auto mb-2" />
              <p className="font-semibold">Click to upload a PDF</p>
              <p className="text-sm">or drag and drop</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={cn(
            "p-4 rounded-lg mb-6",
            statusMessage.includes("✓")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          )}
        >
          {statusMessage}
          {isProcessing && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="p-4 rounded-lg mb-6 bg-red-50 text-red-700 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Tools Grid */}
      {file && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={tool.action}
              disabled={!tool.enabled}
              className={cn(
                "p-4 rounded-lg border-2 transition text-left",
                tool.enabled
                  ? "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 cursor-pointer"
                  : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
              )}
            >
              <div className="text-blue-600 mb-2">{tool.icon}</div>
              <h3 className="font-semibold text-gray-900">{tool.name}</h3>
              <p className="text-sm text-gray-600">{tool.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
        <h3 className="font-semibold text-gray-900 mb-3">About This Editor</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• Powered by Ghostscript (open source PDF rendering engine)</li>
          <li>• Server-side processing for reliable results</li>
          <li>• Supports compression with multiple quality levels</li>
          <li>• Web optimization for faster page loading</li>
          <li>• Works with PDFs of any size</li>
          <li>• GitHub: ArtifexSoftware/ghostpdl (Apache/AGPL licensed)</li>
        </ul>
      </div>

      {/* Download Info */}
      {!file && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 <strong>Ghostscript Installation:</strong>
            <br />
            Windows: Download from ghostscript.com or use chocolatey
            <br />
            Linux: <code className="bg-gray-200 px-2 py-1 rounded">apt-get install ghostscript</code>
            <br />
            macOS: <code className="bg-gray-200 px-2 py-1 rounded">brew install ghostscript</code>
          </p>
        </div>
      )}
    </div>
  );
}
