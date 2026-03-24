import fitz
from io import BytesIO

# Create test PDF
doc = fitz.open()
page = doc.new_page()
page.insert_textbox(fitz.Rect(50, 50, 300, 100), "Original text", fontsize=12, color=(0,0,0))
output_stream = BytesIO()
doc.save(output_stream)
test_bytes = output_stream.getvalue()
doc.close()

# Test replacement
doc = fitz.open(stream=test_bytes, filetype="pdf")
page = doc[0]
rect = fitz.Rect(50, 50, 300, 100)

# Draw white background and insert new text
page.draw_rect(rect, color=None, fill=(1, 1, 1), width=0)
page.insert_textbox(rect, "REPLACEMENT TEXT", fontsize=12, color=(0, 0, 0))

output = BytesIO()
doc.save(output)
result = output.getvalue()
doc.close()

print("SUCCESS: Text replacement completed without errors!")
print(f"Output PDF size: {len(result)} bytes")
print("The replacement text should be visible as black text on white background.")
