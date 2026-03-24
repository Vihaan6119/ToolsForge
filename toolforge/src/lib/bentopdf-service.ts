/**
 * BentoPDF Service Integration
 * Modern PDF processing service using BentoML
 */

export interface BentoPdfConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface PdfOperationResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

class BentoPdfService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: BentoPdfConfig) {
    this.baseUrl = config.baseUrl || 'http://bentopdf:3000';
    this.apiKey = config.apiKey || '';
    this.timeout = config.timeout || 300000;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async mergePdfs(files: File[]): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('pdfs', f));

      const response = await fetch(`${this.baseUrl}/v1/merge`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: 'Merge failed' };
      }

      return { success: true, data: await response.arrayBuffer() };
    } catch (e) {
      return { success: false, error: `Error: ${e}` };
    }
  }

  async splitPdf(file: File): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${this.baseUrl}/v1/split`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: 'Split failed' };
      }

      return { success: true, data: await response.arrayBuffer() };
    } catch (e) {
      return { success: false, error: `Error: ${e}` };
    }
  }

  async compressPdf(file: File, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('quality', quality);

      const response = await fetch(`${this.baseUrl}/v1/compress`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: 'Compression failed' };
      }

      return { success: true, data: await response.arrayBuffer() };
    } catch (e) {
      return { success: false, error: `Error: ${e}` };
    }
  }

  async extractText(file: File): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${this.baseUrl}/v1/ocr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: 'OCR failed' };
      }

      return { success: true, data: await response.arrayBuffer() };
    } catch (e) {
      return { success: false, error: `Error: ${e}` };
    }
  }

  async addWatermark(file: File, text: string, opacity: number = 0.3): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('text', text);
      formData.append('opacity', opacity.toString());

      const response = await fetch(`${this.baseUrl}/v1/watermark`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: 'Watermark failed' };
      }

      return { success: true, data: await response.arrayBuffer() };
    } catch (e) {
      return { success: false, error: `Error: ${e}` };
    }
  }
}

export const bentoPdfService = new BentoPdfService({
  baseUrl: process.env.BENTOPDF_URL || 'http://bentopdf:3000',
  apiKey: process.env.BENTOPDF_API_KEY || '',
  timeout: 300000,
});
