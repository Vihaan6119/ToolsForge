"use client";

import { useCallback, useState } from "react";

interface GenerateOptions {
  prompt: string;
  system?: string;
  temperature?: number;
}

interface UseAiOptions {
  onSuccess?: (response: string) => void;
  onError?: (error: Error) => void;
}

interface GenerateApiSuccess {
  response: string;
}

interface GenerateApiError {
  error?: string;
}

function toErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

export function useAi({ onSuccess, onError }: UseAiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async ({ prompt, system, temperature }: GenerateOptions) => {
      const normalizedPrompt = prompt.trim();

      if (!normalizedPrompt) {
        const promptError = new Error("Please enter a prompt before generating.");
        setError(promptError.message);
        onError?.(promptError);
        throw promptError;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: normalizedPrompt,
            system,
            temperature,
          }),
        });

        const payload = (await response.json().catch(() => null)) as GenerateApiSuccess | GenerateApiError | null;

        if (!response.ok) {
          const message = toErrorMessage(
            payload,
            "Unable to generate a response right now. Please check that Ollama is running.",
          );
          const requestError = new Error(message);
          setError(message);
          onError?.(requestError);
          throw requestError;
        }

        const generated =
          payload && typeof payload === "object" && "response" in payload && typeof payload.response === "string"
            ? payload.response
            : "";

        if (!generated.trim()) {
          const emptyError = new Error("The AI response was empty. Try a more specific prompt.");
          setError(emptyError.message);
          onError?.(emptyError);
          throw emptyError;
        }

        onSuccess?.(generated);
        return generated;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        const unknownError = new Error("Unknown AI generation error.");
        setError(unknownError.message);
        onError?.(unknownError);
        throw unknownError;
      } finally {
        setIsLoading(false);
      }
    },
    [onError, onSuccess],
  );

  return {
    isLoading,
    error,
    generate,
    clearError: () => setError(null),
  };
}