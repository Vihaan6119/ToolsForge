import fitz

# Create a small test to verify correct parameter name
doc = fitz.open()
page = doc.new_page()

print("Testing draw_rect parameters...")

# Test with width parameter (correct)
try:
    rect = fitz.Rect(50, 50, 150, 100)
    page.draw_rect(rect, color=None, fill=(1, 1, 1), width=0)
    print("✓ width=0 parameter works")
except TypeError as e:
    print(f"✗ width parameter error: {e}")

# Test with lineWidth parameter (incorrect - should fail)
try:
    rect = fitz.Rect(50, 50, 150, 100)
    page.draw_rect(rect, color=None, fill=(1, 1, 1), lineWidth=0)
    print("✗ lineWidth parameter works (unexpected)")
except TypeError as e:
    print(f"✓ lineWidth parameter correctly fails: {e}")

doc.close()
print("\nConclusion: width is the correct parameter name")
