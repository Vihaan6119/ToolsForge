const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_MODEL = "deepseek-r1:1.5b";
const REQUEST_TIMEOUT_MS = 60_000;

export interface GenerateWithDeepSeekOptions {
  prompt: string;
  system?: string;
  temperature?: number;
}

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

type OllamaServiceErrorCode =
  | "BAD_REQUEST"
  | "MODEL_NOT_FOUND"
  | "UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "EMPTY_RESPONSE";

export class OllamaServiceError extends Error {
  code: OllamaServiceErrorCode;
  status: number;

  constructor(message: string, code: OllamaServiceErrorCode, status: number) {
    super(message);
    this.name = "OllamaServiceError";
    this.code = code;
    this.status = status;
  }
}

function isValidTemperature(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 2;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function createErrorFromUpstreamResponse(status: number, payload: unknown): OllamaServiceError {
  const upstreamMessage =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Ollama returned an unexpected response.";

  if (status === 404) {
    return new OllamaServiceError(
      `The local model \"${OLLAMA_MODEL}\" was not found. Run \"ollama pull ${OLLAMA_MODEL}\" and try again.`,
      "MODEL_NOT_FOUND",
      503,
    );
  }

  if (status >= 400 && status < 500) {
    return new OllamaServiceError(upstreamMessage, "BAD_REQUEST", 400);
  }

  return new OllamaServiceError(upstreamMessage, "UPSTREAM_ERROR", 502);
}

export async function generateWithDeepSeek({
  prompt,
  system,
  temperature,
}: GenerateWithDeepSeekOptions): Promise<string> {
  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    throw new OllamaServiceError("Prompt is required.", "BAD_REQUEST", 400);
  }

  if (temperature !== undefined && !isValidTemperature(temperature)) {
    throw new OllamaServiceError("Temperature must be between 0 and 2.", "BAD_REQUEST", 400);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: normalizedPrompt,
        system: system?.trim() || undefined,
        stream: false,
        options: {
          temperature: temperature ?? 0.5,
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw createErrorFromUpstreamResponse(response.status, payload);
    }

    const data = payload as OllamaGenerateResponse | null;
    const generatedText = data?.response?.trim();

    if (!generatedText) {
      throw new OllamaServiceError(
        "The model returned an empty response. Try refining your prompt.",
        "EMPTY_RESPONSE",
        502,
      );
    }

    return generatedText;
  } catch (error) {
    if (error instanceof OllamaServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OllamaServiceError(
        "Ollama took too long to respond. Please try again.",
        "UNAVAILABLE",
        504,
      );
    }

    throw new OllamaServiceError(
      "Could not connect to local Ollama. Make sure Ollama is running on http://127.0.0.1:11434.",
      "UNAVAILABLE",
      503,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}