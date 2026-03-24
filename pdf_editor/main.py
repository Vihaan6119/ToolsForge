from __future__ import annotations

import argparse
import json
import os
import sys

from ai_interface import (
    AIInterpretationError,
    DEFAULT_MODEL,
    DEFAULT_OLLAMA_HOST,
    DEFAULT_TIMEOUT_SECONDS,
    interpret_command,
)
from pdf_utils import delete_text, insert_text, replace_text


def _default_output_path(input_path: str) -> str:
    base, ext = os.path.splitext(input_path)
    extension = ext if ext else ".pdf"
    return f"{base}_edited{extension}"


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Edit PDF files using natural language commands interpreted by a local AI model."
    )
    parser.add_argument("--input", required=True, help="Input PDF path")
    parser.add_argument("--output", help="Output PDF path")
    parser.add_argument("--command", help="Natural language command")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Ollama model name (default: {DEFAULT_MODEL})")
    parser.add_argument(
        "--ollama-host",
        default=DEFAULT_OLLAMA_HOST,
        help=f"Ollama host URL (default: {DEFAULT_OLLAMA_HOST})",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"AI request timeout in seconds (default: {DEFAULT_TIMEOUT_SECONDS})",
    )
    parser.add_argument(
        "--page",
        type=int,
        default=None,
        help="Optional page override (0-indexed). If set, this overrides model page.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite input file in-place after successful edit.",
    )
    return parser.parse_args()


def _resolve_output_paths(input_path: str, output_arg: str | None, overwrite: bool) -> tuple[str, str]:
    input_abs = os.path.abspath(input_path)

    if overwrite:
        temp_output = f"{input_abs}.tmp.edited.pdf"
        return temp_output, input_abs

    output_path = os.path.abspath(output_arg) if output_arg else _default_output_path(input_abs)
    return output_path, output_path


def _validate_paths(input_path: str, output_path: str, overwrite: bool) -> None:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input PDF not found: {input_path}")

    if not input_path.lower().endswith(".pdf"):
        raise ValueError("Input file must be a PDF.")

    if not overwrite and os.path.abspath(input_path) == os.path.abspath(output_path):
        raise ValueError("Output path cannot be the same as input unless --overwrite is used.")


def _get_user_command(command_arg: str | None) -> str:
    if command_arg and command_arg.strip():
        return command_arg.strip()

    command = input("Enter your command: ").strip()
    if not command:
        raise ValueError("Command cannot be empty.")

    return command


def main() -> int:
    args = _parse_args()

    input_path = os.path.abspath(args.input)
    temp_output_path, final_output_path = _resolve_output_paths(input_path, args.output, args.overwrite)

    try:
        _validate_paths(input_path, temp_output_path, args.overwrite)
        command = _get_user_command(args.command)
    except Exception as exc:
        print(f"Error: {exc}")
        return 1

    print("Interpreting command with local model...")

    try:
        action_payload = interpret_command(
            command,
            model=args.model,
            host=args.ollama_host,
            timeout_seconds=args.timeout,
        )
    except AIInterpretationError as exc:
        print(f"AI interpretation failed: {exc}")
        return 1

    if args.page is not None:
        action_payload["page"] = args.page

    print("Model action:")
    print(json.dumps(action_payload, indent=2))

    action = action_payload.get("action")
    target = str(action_payload.get("target", "")).strip()
    new_value = str(action_payload.get("new_value", "")).strip()
    page_num = action_payload.get("page")

    try:
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)

        if action == "replace_text":
            if not target:
                raise ValueError("replace_text requires a non-empty target.")
            if not new_value:
                raise ValueError("replace_text requires a non-empty new_value.")
            result = replace_text(
                input_path,
                old_text=target,
                new_text=new_value,
                page_num=page_num,
                output_path=temp_output_path,
            )
        elif action == "delete_text":
            if not target:
                raise ValueError("delete_text requires a non-empty target.")
            result = delete_text(
                input_path,
                target_text=target,
                page_num=page_num,
                output_path=temp_output_path,
            )
        elif action == "insert_text":
            if not new_value:
                raise ValueError("insert_text requires a non-empty new_value.")
            result = insert_text(
                input_path,
                new_text=new_value,
                target=target,
                page_num=page_num,
                output_path=temp_output_path,
            )
        else:
            raise ValueError(f"Unknown action: {action}")

        if args.overwrite:
            os.replace(temp_output_path, final_output_path)
            result.output_path = final_output_path

        print("Processing complete.")
        print(f"Action applied: {result.action}")
        print(f"Matches affected: {result.matches}")
        print(f"Pages modified: {result.pages_modified or 'none'}")
        print(f"Output saved to: {result.output_path}")

        if result.matches == 0:
            print("Warning: target text was not found. Try rephrasing with exact text from the PDF.")

        return 0
    except Exception as exc:
        if args.overwrite and os.path.exists(temp_output_path):
            try:
                os.remove(temp_output_path)
            except OSError:
                pass

        print(f"Error while editing PDF: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
