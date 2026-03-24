from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

DEFAULT_MODEL = "deepseek-r1:1.5b"
DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434"
DEFAULT_TIMEOUT_SECONDS = 90
ALLOWED_ACTIONS = {"replace_text", "insert_text", "delete_text"}

PROMPT_TEMPLATE = """
You are an assistant that translates natural language commands into JSON actions for a PDF editor.
The JSON must have the following fields:
- \"action\": one of [\"replace_text\", \"insert_text\", \"delete_text\"]
- \"target\": the exact text to be replaced (or location description)
- \"new_value\": the new text (for replace/insert)
- \"page\": optional page number where page 0 is the first page

Examples:
User: \"Change the word 'hello' to 'goodbye' on page 2\"
Assistant: {\"action\":\"replace_text\",\"target\":\"hello\",\"new_value\":\"goodbye\",\"page\":1}

User: \"Delete the line 'Terms and Conditions'\"
Assistant: {\"action\":\"delete_text\",\"target\":\"Terms and Conditions\",\"page\":0}

User: \"Insert 'Draft' at the top of page 1\"
Assistant: {\"action\":\"insert_text\",\"target\":\"top of page\",\"new_value\":\"Draft\",\"page\":0}

Now respond only with valid JSON. No markdown, no extra explanation.
User: {user_input}
""".strip()


class AIInterpretationError(RuntimeError):
    pass


def _call_with_ollama_package(prompt: str, model: str, host: str) -> str:
    try:
        from ollama import Client
    except Exception as exc:  # pragma: no cover - fallback path
        raise AIInterpretationError(
            "Python package ollama is not available. Install with: pip install ollama"
        ) from exc

    client = Client(host=host)

    try:
        response = client.generate(
            model=model,
            prompt=prompt,
            stream=False,
            options={"temperature": 0},
        )
    except TypeError:
        response = client.generate(model=model, prompt=prompt, stream=False)

    if isinstance(response, dict):
        text = response.get("response")
        if isinstance(text, str):
            return text

        message = response.get("message")
        if isinstance(message, dict):
            content = message.get("content")
            if isinstance(content, str):
                return content

    return str(response)


def _call_with_http(prompt: str, model: str, host: str, timeout_seconds: int) -> str:
    payload = json.dumps(
        {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0},
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        f"{host.rstrip('/')}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            body = response.read().decode("utf-8")
    except urllib.error.URLError as exc:
        raise AIInterpretationError(
            "Failed to reach local Ollama server. Ensure it is running on "
            f"{host} and model {model} is available."
        ) from exc

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise AIInterpretationError("Ollama returned non-JSON response.") from exc

    text = parsed.get("response") if isinstance(parsed, dict) else None
    if not isinstance(text, str) or not text.strip():
        raise AIInterpretationError("Ollama returned an empty response.")

    return text


def _extract_json_blob(text: str) -> dict[str, Any]:
    fenced = re.findall(r"```(?:json)?\\s*(\{[\\s\\S]*?\})\\s*```", text, flags=re.IGNORECASE)
    candidates: list[str] = list(fenced)

    start = text.find("{")
    while start != -1:
        depth = 0
        in_string = False
        escape = False

        for index in range(start, len(text)):
            char = text[index]

            if in_string:
                if escape:
                    escape = False
                elif char == "\\":
                    escape = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    candidates.append(text[start : index + 1])
                    break

        start = text.find("{", start + 1)

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        if isinstance(parsed, dict):
            return parsed

    raise AIInterpretationError("Could not parse JSON action from model response.")


def _normalize_action(payload: dict[str, Any]) -> dict[str, Any]:
    action = str(payload.get("action", "")).strip().lower()
    if action not in ALLOWED_ACTIONS:
        raise AIInterpretationError(f"Unsupported action returned by model: {action or 'empty'}")

    target = payload.get("target", "")
    new_value = payload.get("new_value", "")

    target_str = str(target).strip() if target is not None else ""
    new_value_str = str(new_value).strip() if new_value is not None else ""

    page = payload.get("page")
    page_num: int | None = None

    if page is not None and str(page).strip() != "":
        try:
            page_num = int(page)
        except (TypeError, ValueError) as exc:
            raise AIInterpretationError("Model returned a non-integer page value.") from exc

        if page_num < 0:
            raise AIInterpretationError("Model returned a negative page value.")

    return {
        "action": action,
        "target": target_str,
        "new_value": new_value_str,
        "page": page_num,
    }


def interpret_command(
    user_input: str,
    model: str = DEFAULT_MODEL,
    host: str = DEFAULT_OLLAMA_HOST,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    cleaned_input = user_input.strip()
    if not cleaned_input:
        raise AIInterpretationError("Command cannot be empty.")

    prompt = PROMPT_TEMPLATE.format(user_input=cleaned_input)

    try:
        raw_response = _call_with_ollama_package(prompt, model=model, host=host)
    except Exception:
        raw_response = _call_with_http(
            prompt,
            model=model,
            host=host,
            timeout_seconds=timeout_seconds,
        )

    payload = _extract_json_blob(raw_response)
    return _normalize_action(payload)


def get_ai_response(
    prompt: str,
    model: str = DEFAULT_MODEL,
    host: str = DEFAULT_OLLAMA_HOST,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
) -> str:
    """
    Get raw text response from the AI model for any prompt.
    Used for general analysis and optimization tasks.
    """
    cleaned_prompt = prompt.strip()
    if not cleaned_prompt:
        raise AIInterpretationError("Prompt cannot be empty.")

    try:
        response = _call_with_ollama_package(cleaned_prompt, model=model, host=host)
    except Exception:
        response = _call_with_http(
            cleaned_prompt,
            model=model,
            host=host,
            timeout_seconds=timeout_seconds,
        )

    return response.strip()
