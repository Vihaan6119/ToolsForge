"""
AI Interface - Integration with DeepSeek R1 via Ollama
Intelligent text detection and matching for PDF editing using reasoning model
"""

import requests
import json
import sys
from typing import Optional


OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME = "deepseek-r1:1.5b"
REQUEST_TIMEOUT = 60  # Increased timeout for reasoning model


def check_ollama_running() -> bool:
    """Check if Ollama service is running"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/version", timeout=2)
        return response.status_code == 200
    except:
        return False


def get_ai_response(user_prompt: str, max_tokens: int = 500) -> str:
    """
    Get response from DeepSeek R1 LLM via Ollama
    Uses reasoning model for intelligent text matching and PDF analysis
    
    Args:
        user_prompt: Instruction or question for the AI
        max_tokens: Maximum tokens in response
        
    Returns:
        AI-generated response
    """
    if not check_ollama_running():
        print(
            f"⚠ [AI] Ollama not running on {OLLAMA_BASE_URL}",
            file=sys.stderr
        )
        return user_prompt
    
    try:
        # System prompt optimized for PDF text detection
        system_prompt = """You are a PDF text analysis expert. Your role is to help locate and match text in PDF documents.
When given a target text and available text options, find the best match considering:
- Exact matches
- Partial matches with context
- Similar text with different formatting
- Text broken across lines

Be precise and concise in your responses. When finding text, respond with ONLY the matching text found in the document."""
        
        payload = {
            "model": MODEL_NAME,
            "prompt": user_prompt,
            "system": system_prompt,
            "stream": False,
        }
        
        print(f"[AI] Querying DeepSeek R1...", file=sys.stderr)
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get("response", "").strip()
            print(f"[AI] Response received ({len(ai_response)} chars)", file=sys.stderr)
            return ai_response if ai_response else user_prompt
        else:
            print(
                f"⚠ [AI] Ollama error {response.status_code}: {response.text}",
                file=sys.stderr
            )
            return user_prompt
            
    except requests.Timeout:
        print(f"⚠ [AI] Ollama request timeout", file=sys.stderr)
        return user_prompt
    except Exception as e:
        print(f"⚠ [AI] Error: {str(e)}", file=sys.stderr)
        return user_prompt
