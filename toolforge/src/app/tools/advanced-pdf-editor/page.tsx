"use client";

import AdvancedPdfEditor from "@/components/tools/advanced-pdf-editor";
import Navbar from "@/components/ui/navbar";
import { useToolUsage } from "@/hooks/use-tool-usage";

export default function AdvancedPdfEditorPage() {
  const { isLoading } = useToolUsage("advanced-pdf-editor");

  if (isLoading) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Navbar />
      <main className="container mx-auto py-8 px-4">
        <AdvancedPdfEditor />
      </main>
    </div>
  );
}
