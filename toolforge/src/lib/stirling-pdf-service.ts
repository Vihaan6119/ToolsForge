/**
 * BentoPDF Service Integration
 * Modern PDF processing service using BentoML
 * Provides async-first PDF operations with automatic caching
 */

export interface BentoPdfConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
}

export interface PdfOperationResult {
  success: boolean;
  data?: ArrayBuffer;
  taskId?: string;
  error?: string;
  message?: string;
}

export interface PdfTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: ArrayBuffer;
  error?: string;
}

class BentoPdfService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retries: number;

  constructor(config: BentoPdfConfig) {
    this.baseUrl = config.baseUrl || process.env.BENTOPDF_URL || 'http://bentopdf:3000';
    this.apiKey = config.apiKey || process.env.BENTOPDF_API_KEY || '';
    this.timeout = config.timeout || 300000;
    this.retries = config.retries || 3;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client': 'ToolsForge',
    };
  }

  private async fetchWithRetry(
    endpoint: string,
    options: RequestInit = {},
    attemptNumber = 1
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: { ...this.getHeaders(), ...(options.headers || {}) },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && attemptNumber < this.retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attemptNumber));
        return this.fetchWithRetry(endpoint, options, attemptNumber + 1);
      }

      return response;
    } catch (error) {
      if (attemptNumber < this.retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attemptNumber));
        return this.fetchWithRetry(endpoint, options, attemptNumber + 1);
      }
      throw error;
    }
  }

  /**
   * Check if BentoPDF service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get task status (for async operations)
   */
  async getTaskStatus(taskId: string): Promise<PdfTask> {
    try {
      const response = await this.fetchWithRetry(`/tasks/${taskId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          taskId,
          status: 'failed',
          error: `Task status check failed: ${response.statusText}`,
        };
      }

      return await response.json() as PdfTask;
    } catch (error) {
      return {
        taskId,
        status: 'failed',
        error: `Status check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Merge multiple PDF files
   */
  async mergePdfs(files: File[]): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('pdfs', file);
      });

      const response = await this.fetchWithRetry('/v1/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Merge failed: ${response.statusText}`,
        };
      }

      // Check if async (returns taskId)
      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return {
          success: true,
          taskId: result.taskId as string,
        };
      }

      // Synchronous response
      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Merge error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Split PDF into individual pages
   */
  async splitPdf(file: File): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await this.fetchWithRetry('/v1/split', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Split failed: ${response.statusText}`,
        };
      }

      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return { success: true, taskId: result.taskId as string };
      }

      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Split error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Compress PDF
   */
  async compressPdf(file: File, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('quality', quality);

      const response = await this.fetchWithRetry('/v1/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Compression failed: ${response.statusText}`,
        };
      }

      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return { success: true, taskId: result.taskId as string };
      }

      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Compression error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Extract text from PDF (OCR)
   */
  async extractText(file: File, language: string = 'eng'): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('language', language);

      const response = await this.fetchWithRetry('/v1/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Text extraction failed: ${response.statusText}`,
        };
      }

      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return { success: true, taskId: result.taskId as string };
      }

      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Text extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Add watermark to PDF
   */
  async addWatermark(file: File, text: string, opacity: number = 0.3): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('text', text);
      formData.append('opacity', opacity.toString());

      const response = await this.fetchWithRetry('/v1/watermark', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Watermark failed: ${response.statusText}`,
        };
      }

      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return { success: true, taskId: result.taskId as string };
      }

      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Watermark error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Rotate pages
   */
  async rotatePdf(file: File, angle: number, pages: string = 'all'): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('angle', angle.toString());
      formData.append('pages', pages);

      const response = await this.fetchWithRetry('/v1/rotate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Rotation failed: ${response.statusText}`,
        };
      }

      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return { success: true, taskId: result.taskId as string };
      }

      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Rotation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Convert images to PDF
   */
  async imagesToPdf(files: File[]): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await this.fetchWithRetry('/v1/images-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Conversion failed: ${response.statusText}`,
        };
      }

      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return { success: true, taskId: result.taskId as string };
      }

      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Convert PDF to images
   */
  async pdfToImages(file: File, format: 'png' | 'jpg' = 'png'): Promise<PdfOperationResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('format', format);

      const response = await this.fetchWithRetry('/v1/pdf-to-images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Conversion failed: ${response.statusText}`,
        };
      }

      const result = await response.json() as Record<string, unknown>;
      if (result.taskId) {
        return { success: true, taskId: result.taskId as string };
      }

      const data = await response.arrayBuffer();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const bentoPdfService = new BentoPdfService({
  baseUrl: process.env.BENTOPDF_URL || 'http://bentopdf:3000',
  apiKey: process.env.BENTOPDF_API_KEY || 'dev-key-change-in-production',
  timeout: 300000,
  retries: 3,
});

export default BentoPdfService;
