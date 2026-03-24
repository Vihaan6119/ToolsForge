export type ToolCategory = "Image" | "PDF" | "Text" | "Utility";

export type ToolCategoryFilter = ToolCategory | "All";

export interface ToolDefinition {
  name: string;
  slug: string;
  description: string;
  category: ToolCategory;
  icon: ToolIconKey;
  isPopular?: boolean;
  aiContext?: string;
}

export type ToolIconKey =
  | "image"
  | "resize"
  | "scan"
  | "convert"
  | "textImage"
  | "pdfEdit"
  | "merge"
  | "split"
  | "compress"
  | "word"
  | "case"
  | "json"
  | "password"
  | "uuid"
  | "qr";
