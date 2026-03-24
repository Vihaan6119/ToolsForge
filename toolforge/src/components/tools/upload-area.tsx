"use client";

import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { CloudUpload, FileText } from "lucide-react";
import { useRef, useState } from "react";

interface UploadAreaProps {
  acceptedFileTypes: string;
  onFileSelect: (file: File | null) => void;
  file: File | null;
  disabled?: boolean;
  helperText?: string;
}

export default function UploadArea({
  acceptedFileTypes,
  onFileSelect,
  file,
  disabled = false,
  helperText,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (incomingFile: File | undefined) => {
    if (!incomingFile) {
      return;
    }

    onFileSelect(incomingFile);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onDragOver={(event) => {
        if (disabled) {
          return;
        }

        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (disabled) {
          return;
        }

        event.preventDefault();
        setIsDragging(false);
        handleFile(event.dataTransfer.files?.[0]);
      }}
      onClick={() => {
        if (!disabled) {
          inputRef.current?.click();
        }
      }}
      className={cn(
        "group cursor-pointer rounded-2xl border border-dashed border-white/25 bg-white/5 p-6 transition-all",
        isDragging && "border-cyan-300/70 bg-cyan-300/10",
        disabled && "cursor-not-allowed opacity-55",
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label="Upload a PDF file"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFileTypes}
        disabled={disabled}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-200">
          <CloudUpload size={24} />
        </span>

        <div>
          <p className="text-lg font-medium text-white">Drag and drop your PDF here</p>
          <p className="mt-1 text-sm text-slate-300">or click to browse from your device</p>
        </div>

        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Supports: PDF files up to 25MB</p>

        {helperText ? <p className="text-xs text-slate-400">{helperText}</p> : null}

        {file ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
            <FileText size={16} />
            {file.name}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
