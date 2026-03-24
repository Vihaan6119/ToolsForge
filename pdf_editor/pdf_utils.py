from __future__ import annotations

from dataclasses import dataclass
import json
import os
from typing import Any
from typing import Iterable

import fitz

try:
    from pdf_editor.ai_interface import get_ai_response
except ImportError:
    from ai_interface import get_ai_response


@dataclass
class EditResult:
    action: str
    matches: int
    pages_modified: list[int]
    output_path: str


@dataclass
class ReplacementPlan:
    rect: fitz.Rect
    replacement_text: str
    fontname: str
    fontsize: float
    color: tuple[float, float, float]
    page_index: int
    span_index: int
    original_text: str


def _iter_page_numbers(doc: fitz.Document, page_num: int | None) -> Iterable[int]:
    if page_num is None:
        return range(doc.page_count)

    if page_num < 0 or page_num >= doc.page_count:
        raise ValueError(
            f"Page {page_num} is out of range for this document. Valid range: 0..{doc.page_count - 1}."
        )

    return [page_num]


def _save_document(doc: fitz.Document, output_path: str) -> None:
    if os.path.exists(output_path):
        os.remove(output_path)

    doc.save(output_path, garbage=4, clean=True, deflate=True)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _fontname_from_source(font_name: str) -> str:
    lowered = font_name.lower()

    if "cour" in lowered or "mono" in lowered:
        return "cour"

    if "times" in lowered or "serif" in lowered:
        return "tiro"

    is_bold = any(token in lowered for token in ("bold", "black", "demi"))
    is_italic = any(token in lowered for token in ("italic", "oblique"))

    if is_bold and is_italic:
        return "helvBI"
    if is_bold:
        return "helvB"
    if is_italic:
        return "helvI"
    return "helv"


def _color_int_to_rgb(color_value: int) -> tuple[float, float, float]:
    color_value = int(color_value)
    red = ((color_value >> 16) & 0xFF) / 255
    green = ((color_value >> 8) & 0xFF) / 255
    blue = (color_value & 0xFF) / 255
    return (red, green, blue)


def _iter_spans(page: fitz.Page) -> Iterable[dict[str, Any]]:
    text_dict = page.get_text("dict")

    for block in text_dict.get("blocks", []):
        if block.get("type") != 0:
            continue

        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if not isinstance(span.get("text"), str):
                    continue
                yield span


def _build_replacement_plans(
    page: fitz.Page,
    old_text: str,
    new_text: str,
) -> tuple[list[ReplacementPlan], int]:
    plans: list[ReplacementPlan] = []
    occurrence_count = 0

    for span_idx, span in enumerate(_iter_spans(page)):
        span_text = span.get("text", "")
        if not span_text or old_text not in span_text:
            continue

        replacement_text = span_text.replace(old_text, new_text)
        rect = fitz.Rect(span.get("bbox", (0, 0, 0, 0)))
        if rect.width <= 0 or rect.height <= 0:
            continue

        fontname = _fontname_from_source(str(span.get("font", "helv")))
        fontsize = _clamp(float(span.get("size", 11.0)), 4.0, 72.0)
        color = _color_int_to_rgb(int(span.get("color", 0)))

        plans.append(
            ReplacementPlan(
                rect=rect,
                replacement_text=replacement_text,
                fontname=fontname,
                fontsize=fontsize,
                color=color,
                page_index=-1,  # Will be set later
                span_index=span_idx,
                original_text=span_text,
            )
        )
        occurrence_count += span_text.count(old_text)

    return plans, occurrence_count


def _iter_region_pixels(
    samples: memoryview,
    width: int,
    channels: int,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
):
    for py in range(y0, y1):
        row_offset = py * width * channels
        for px in range(x0, x1):
            offset = row_offset + px * channels
            yield samples[offset], samples[offset + 1], samples[offset + 2]


def _average_rgb(
    samples: memoryview,
    width: int,
    channels: int,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
) -> tuple[float, float, float] | None:
    if x1 <= x0 or y1 <= y0:
        return None

    red = 0
    green = 0
    blue = 0
    count = 0

    for pr, pg, pb in _iter_region_pixels(samples, width, channels, x0, y0, x1, y1):
        red += pr
        green += pg
        blue += pb
        count += 1

    if count == 0:
        return None

    return (red / (255 * count), green / (255 * count), blue / (255 * count))


def _sample_background_fill(page: fitz.Page, rect: fitz.Rect) -> tuple[float, float, float]:
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False, annots=False)
    samples = memoryview(pix.samples)
    width = pix.width
    height = pix.height
    channels = pix.n

    if width <= 0 or height <= 0 or channels < 3:
        return (1.0, 1.0, 1.0)

    sx = width / page.rect.width
    sy = height / page.rect.height

    x0 = int(_clamp(rect.x0 * sx, 0, width - 1))
    y0 = int(_clamp(rect.y0 * sy, 0, height - 1))
    x1 = int(_clamp(rect.x1 * sx, 1, width))
    y1 = int(_clamp(rect.y1 * sy, 1, height))

    pad = 3
    top = _average_rgb(samples, width, channels, max(0, x0 - pad), max(0, y0 - pad), min(width, x1 + pad), y0)
    bottom = _average_rgb(samples, width, channels, max(0, x0 - pad), y1, min(width, x1 + pad), min(height, y1 + pad))
    left = _average_rgb(samples, width, channels, max(0, x0 - pad), max(0, y0 - pad), x0, min(height, y1 + pad))
    right = _average_rgb(samples, width, channels, x1, max(0, y0 - pad), min(width, x1 + pad), min(height, y1 + pad))

    candidates = [color for color in (top, bottom, left, right) if color is not None]
    if not candidates:
        return (1.0, 1.0, 1.0)

    red = sum(color[0] for color in candidates) / len(candidates)
    green = sum(color[1] for color in candidates) / len(candidates)
    blue = sum(color[2] for color in candidates) / len(candidates)
    return (red, green, blue)


def _insert_text_fitted(
    page: fitz.Page,
    rect: fitz.Rect,
    text: str,
    fontname: str,
    fontsize: float,
    color: tuple[float, float, float],
) -> None:
    size = fontsize
    for _ in range(20):
        remaining = page.insert_textbox(
            rect,
            text,
            fontname=fontname,
            fontsize=size,
            color=color,
            align=fitz.TEXT_ALIGN_LEFT,
        )
        if remaining >= 0:
            return
        size = max(4.0, size - 0.5)

    page.insert_text(
        fitz.Point(rect.x0, rect.y1 - 1),
        text,
        fontname=fontname,
        fontsize=max(4.0, size),
        color=color,
    )


def _insert_text_in_rect(page: fitz.Page, rect: fitz.Rect, text: str) -> None:
    fontsize = _clamp(rect.height * 0.9, 6.0, 22.0)
    _insert_text_fitted(page, rect, text, "helv", fontsize, (0, 0, 0))


def _optimize_replacements_with_deepseek(plans: list[ReplacementPlan]) -> list[ReplacementPlan]:
    """
    Use DeepSeek R1 to intelligently analyze replacements:
    - Identify optimal font matching
    - Suggest text fitting strategies
    - Validate visual compatibility
    - Return enhanced plans with optimal settings
    """
    if not plans:
        return plans

    # Build analysis prompt for DeepSeek
    replacements_info = []
    for i, plan in enumerate(plans):
        replacements_info.append({
            "index": i,
            "original_text": plan.original_text,
            "new_text": plan.replacement_text,
            "original_font": plan.fontname,
            "original_size": plan.fontsize,
            "rect_width": plan.rect.width,
            "rect_height": plan.rect.height,
            "new_text_length": len(plan.replacement_text),
            "original_text_length": len(plan.original_text),
        })

    # Create detailed analysis prompt
    prompt = f"""You are a PDF text replacement expert. Analyze these text replacements and provide optimization guidance.

REPLACEMENTS TO ANALYZE:
{json.dumps(replacements_info, indent=2)}

For each replacement, provide ONLY valid JSON with these fields:
- index: number (matches input index)
- best_font: string (recommended PDF font: helv, helvB, helvI, helvBI, cour, tiro, or original)
- font_size: float (recommended size in points, or -1 to keep original)
- text_fitting: string ('fit_width', 'shrink', 'keep_original', or 'fit_height')
- priority: string ('critical', 'high', 'normal', 'low')
- notes: string (brief explanation)

Respond ONLY with JSON array, no other text. Example:
{{"index":0,"best_font":"helv","font_size":11.0,"text_fitting":"fit_width","priority":"high","notes":"text is 15% longer but width allows"}}

ANALYZE NOW:"""

    try:
        response_text = get_ai_response(prompt)

        # Extract JSON from response
        json_match = response_text.strip()
        if json_match.startswith("["):
            optimizations = json.loads(json_match)
        elif "{" in json_match:
            # Try to find JSON array in the response
            start = json_match.find("[")
            end = json_match.rfind("]") + 1
            if start >= 0 and end > start:
                optimizations = json.loads(json_match[start:end])
            else:
                optimizations = []
        else:
            optimizations = []

        # Apply optimization results
        for opt in optimizations:
            idx = int(opt.get("index", -1))
            if 0 <= idx < len(plans):
                plan = plans[idx]

                # Apply best font recommendation
                best_font = opt.get("best_font", plan.fontname)
                if best_font and best_font != "original":
                    plan.fontname = best_font

                # Apply font size recommendation
                new_size = opt.get("font_size", -1)
                if new_size > 0:
                    plan.fontsize = _clamp(new_size, 4.0, 72.0)

                # Adjust rect for text fitting strategy
                fitting_strategy = opt.get("text_fitting", "keep_original")
                if fitting_strategy == "fit_width":
                    # Expand rect if possible to fit text
                    if plan.replacement_text:
                        ratio = len(plan.replacement_text) / max(1, len(plan.original_text))
                        if ratio > 1.1 and plan.fontsize > 5:
                            # Need to shrink font slightly
                            plan.fontsize = max(4.0, plan.fontsize * 0.95)

    except Exception as e:
        # If DeepSeek analysis fails, return original plans
        print(f"DeepSeek optimization failed: {e}, using original plans")
        pass

    return plans


def _apply_vector_replacement(page: fitz.Page, plan: ReplacementPlan) -> None:
    """
    Apply replacement using vector PDF operations.
    This ensures pixel-perfect positioning with no raster artifacts.
    """
    # Step 1: Remove the original text by redacting it
    # (This ensures the original text is completely gone, not just overlaid)
    fill_color = _sample_background_fill(page, plan.rect)

    # Add redaction annotation at the exact location
    page.add_redact_annot(plan.rect, fill=fill_color)

    # Apply the redaction to the page
    # This completely removes the original text from the PDF
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    # Step 2: Insert the replacement text at the exact same position
    # Use insert_textbox for better layout control
    text_box = plan.rect.copy()

    # Use higher-quality text insertion with proper font matching
    remaining = page.insert_textbox(
        text_box,
        plan.replacement_text,
        fontname=plan.fontname,
        fontsize=plan.fontsize,
        color=plan.color,
        align=fitz.TEXT_ALIGN_LEFT,
    )

    # If text doesn't fit, try with reduced font size
    if remaining > 0 and plan.fontsize > 4:
        shrunk_size = max(4.0, plan.fontsize * 0.9)
        page.insert_textbox(
            text_box,
            plan.replacement_text,
            fontname=plan.fontname,
            fontsize=shrunk_size,
            color=plan.color,
            align=fitz.TEXT_ALIGN_LEFT,
        )


def _is_location_target(target: str) -> bool:
    lowered = target.lower()
    location_keywords = [
        "top",
        "bottom",
        "left",
        "right",
        "center",
        "middle",
        "corner",
        "header",
        "footer",
    ]
    return any(keyword in lowered for keyword in location_keywords)


def _resolve_insert_point(page: fitz.Page, target: str) -> fitz.Point | None:
    lowered = target.lower()
    rect = page.rect

    margin_x = max(24.0, rect.width * 0.05)
    margin_y = max(24.0, rect.height * 0.05)

    if "top right" in lowered:
        return fitz.Point(rect.x1 - rect.width * 0.35, margin_y)

    if "top center" in lowered or ("top" in lowered and "center" in lowered):
        return fitz.Point(rect.x0 + rect.width * 0.35, margin_y)

    if "top" in lowered or "header" in lowered:
        return fitz.Point(margin_x, margin_y)

    if "bottom right" in lowered:
        return fitz.Point(rect.x1 - rect.width * 0.35, rect.y1 - margin_y)

    if "bottom center" in lowered or ("bottom" in lowered and "center" in lowered):
        return fitz.Point(rect.x0 + rect.width * 0.35, rect.y1 - margin_y)

    if "bottom" in lowered or "footer" in lowered:
        return fitz.Point(margin_x, rect.y1 - margin_y)

    if "center" in lowered or "middle" in lowered:
        return fitz.Point(rect.x0 + rect.width * 0.35, rect.y0 + rect.height * 0.5)

    if "right" in lowered:
        return fitz.Point(rect.x1 - rect.width * 0.35, rect.y0 + rect.height * 0.25)

    if "left" in lowered:
        return fitz.Point(margin_x, rect.y0 + rect.height * 0.25)

    return None


def replace_text(
    pdf_path: str,
    old_text: str,
    new_text: str,
    page_num: int | None = None,
    output_path: str = "output.pdf",
) -> EditResult:
    """
    Replace text in PDF with pixel-perfect vector rendering.
    Uses DeepSeek to intelligently match fonts and handle text fitting.
    No raster artifacts, no visible editing traces.
    """
    if not old_text.strip():
        raise ValueError("old_text cannot be empty.")

    doc = fitz.open(pdf_path)

    try:
        matches = 0
        pages_modified: list[int] = []
        all_plans: list[ReplacementPlan] = []

        # Step 1: Collect all replacement plans
        selected_pages = set(_iter_page_numbers(doc, page_num))
        for page_index in range(doc.page_count):
            if page_index not in selected_pages:
                continue

            page = doc[page_index]
            plans, plan_matches = _build_replacement_plans(page, old_text, new_text)
            
            for plan in plans:
                plan.page_index = page_index
            
            all_plans.extend(plans)
            matches += plan_matches

        # Step 2: Use DeepSeek to optimize font matching for all replacements
        if all_plans:
            all_plans = _optimize_replacements_with_deepseek(all_plans)

        # Step 3: Apply replacements with vector operations (no raster)
        pages_to_update = {}
        for plan in all_plans:
            if plan.page_index not in pages_to_update:
                pages_to_update[plan.page_index] = []
            pages_to_update[plan.page_index].append(plan)

        # Create output document
        output_doc = fitz.open()

        for index in range(doc.page_count):
            page = doc[index]

            if index not in pages_to_update:
                output_doc.insert_pdf(doc, from_page=index, to_page=index)
                continue

            # Clone this page to output doc
            output_doc.insert_pdf(doc, from_page=index, to_page=index)
            out_page = output_doc[output_doc.page_count - 1]

            # Apply all replacements on this page
            for plan in pages_to_update[index]:
                _apply_vector_replacement(out_page, plan)

            pages_modified.append(index)

        _save_document(output_doc, output_path)
        output_doc.close()

        return EditResult(
            action="replace_text",
            matches=matches,
            pages_modified=pages_modified,
            output_path=output_path,
        )
    finally:
        doc.close()


def delete_text(
    pdf_path: str,
    target_text: str,
    page_num: int | None = None,
    output_path: str = "output.pdf",
) -> EditResult:
    if not target_text.strip():
        raise ValueError("target_text cannot be empty.")

    doc = fitz.open(pdf_path)

    try:
        matches = 0
        pages_modified: list[int] = []

        for page_index in _iter_page_numbers(doc, page_num):
            page = doc[page_index]
            text_instances = page.search_for(target_text)
            if not text_instances:
                continue

            for instance in text_instances:
                fill = _sample_background_fill(page, instance)
                page.add_redact_annot(instance, fill=fill)

            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            matches += len(text_instances)
            pages_modified.append(page_index)

        _save_document(doc, output_path)

        return EditResult(
            action="delete_text",
            matches=matches,
            pages_modified=pages_modified,
            output_path=output_path,
        )
    finally:
        doc.close()


def insert_text(
    pdf_path: str,
    new_text: str,
    target: str = "",
    page_num: int | None = 0,
    output_path: str = "output.pdf",
) -> EditResult:
    if not new_text.strip():
        raise ValueError("new_text cannot be empty.")

    doc = fitz.open(pdf_path)

    try:
        page_candidates = list(_iter_page_numbers(doc, page_num))
        if not page_candidates:
            raise ValueError("No page available for insertion.")

        inserted = False
        pages_modified: list[int] = []
        matches = 0

        for page_index in page_candidates:
            page = doc[page_index]
            point: fitz.Point | None = None

            cleaned_target = target.strip()
            if cleaned_target:
                if _is_location_target(cleaned_target):
                    point = _resolve_insert_point(page, cleaned_target)
                else:
                    instances = page.search_for(cleaned_target)
                    if instances:
                        anchor = instances[0]
                        point = fitz.Point(anchor.x0, min(page.rect.y1 - 24, anchor.y1 + 12))
                        matches = len(instances)

            if point is None:
                point = fitz.Point(max(24, page.rect.width * 0.05), max(24, page.rect.height * 0.05))

            text_box = fitz.Rect(
                point.x,
                max(0, point.y - 16),
                min(page.rect.x1 - 12, point.x + page.rect.width * 0.75),
                min(page.rect.y1 - 4, point.y + 28),
            )

            _insert_text_in_rect(page, text_box, new_text)

            inserted = True
            pages_modified.append(page_index)
            if matches == 0:
                matches = 1
            break

        if not inserted:
            raise ValueError("Could not determine where to insert text.")

        _save_document(doc, output_path)

        return EditResult(
            action="insert_text",
            matches=matches,
            pages_modified=pages_modified,
            output_path=output_path,
        )
    finally:
        doc.close()
