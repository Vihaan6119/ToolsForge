import { generateWithDeepSeek, OllamaServiceError } from "@/lib/ollama-service";
import { NextResponse } from "next/server";

interface GenerateRequestBody {
  prompt?: unknown;
  system?: unknown;
  temperature?: unknown;
}

interface ErrorResponseBody {
  error: string;
  code: string;
}

export const runtime = "nodejs";

function toBadRequest(error: string, code = "BAD_REQUEST") {
  return NextResponse.json<ErrorResponseBody>(
    {
      error,
      code,
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  let payload: GenerateRequestBody;

  try {
    payload = (await request.json()) as GenerateRequestBody;
  } catch {
    return toBadRequest("Request body must be valid JSON.");
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

  if (!prompt) {
    return toBadRequest("Prompt is required.");
  }

  const system = typeof payload.system === "string" ? payload.system : undefined;
  const temperature = payload.temperature;

  if (temperature !== undefined && (typeof temperature !== "number" || Number.isNaN(temperature))) {
    return toBadRequest("Temperature must be a number between 0 and 2.");
  }

  try {
    const response = await generateWithDeepSeek({
      prompt,
      system,
      temperature: typeof temperature === "number" ? temperature : undefined,
    });

    return NextResponse.json({ response }, { status: 200 });
  } catch (error) {
    if (error instanceof OllamaServiceError) {
      return NextResponse.json<ErrorResponseBody>(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json<ErrorResponseBody>(
      {
        error: "Unexpected server error while generating AI response.",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}