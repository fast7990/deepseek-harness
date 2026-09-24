---
name: pdf-parse
description: Parse PDF files to extract text, tables, images, and metadata using Python PDF libraries. Handles Chinese text encoding, multi-column layouts, and scanned/image-only PDFs via OCR fallback. Use when the user asks to parse, extract, read, or convert a PDF file, or when a PDF attachment needs content extraction.
whenToUse: Use when the user asks to parse, extract, read, or convert a PDF file, or when a PDF attachment needs content extraction.
---

# PDF Parse

Extract text, tables, images, and metadata from PDF files using Python PDF libraries. Choose the right library for the PDF type, handle Chinese text correctly, and fall back to OCR for scanned/image-only PDFs.

## Step 1 — Identify the PDF

Confirm the file exists and get its path. PDF attachments from the session are saved under `~/.dsh/attachments/v1/files/`. Use the exact saved path the harness reports.

```sh
ls -la "<pdf-path>"
```

## Step 2 — Check available libraries

Check which Python PDF library is installed. Prefer in this order: `pdfplumber` (best for tables + Chinese), `PyMuPDF`/`fitz` (fast, good for mixed content), `PyPDF2` (fallback, weakest for Chinese).

```sh
python -c "import pdfplumber; print('pdfplumber OK')" 2>&1
python -c "import fitz; print('pymupdf OK')" 2>&1
python -c "import PyPDF2; print('pypdf2 OK')" 2>&1
```

If none are available, install one:

```sh
pip install pdfplumber PyMuPDF
```

## Step 3 — Detect PDF type

Run a quick probe: extract text from the first 2 pages. If the extracted text is empty or near-empty (< 50 chars), the PDF is likely a scanned/image-only PDF and needs OCR (Step 5). Otherwise proceed to Step 4.

## Step 4 — Extract text (text-based PDF)

### Preferred: pdfplumber (best for Chinese + tables)

```python
import pdfplumber

with pdfplumber.open(r"<pdf-path>") as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        if text:
            print(f"--- Page {i+1} ---")
            print(text)
        # Extract tables if present
        tables = page.extract_tables()
        for j, table in enumerate(tables):
            print(f"--- Table {j+1} on Page {i+1} ---")
            for row in table:
                print("\t".join([cell or "" for cell in row]))
```

### Fallback: PyMuPDF (faster for large PDFs)

```python
import fitz  # PyMuPDF

doc = fitz.open(r"<pdf-path>")
for i, page in enumerate(doc):
    text = page.get_text()
    if text:
        print(f"--- Page {i+1} ---")
        print(text)
```

## Step 5 — OCR fallback (scanned/image-only PDFs)

If text extraction returns empty or garbled output, the PDF is image-based. Use OCR.

### 5.1 Install Tesseract OCR engine

Check if Tesseract is installed:
```sh
# Windows
Test-Path "C:\Program Files\Tesseract-OCR\tesseract.exe"
# Linux/Mac
which tesseract
```

If not installed on Windows:
```sh
winget install UB-Mannheim.TesseractOCR --accept-package-agreements --accept-source-agreements
```

Install pytesseract Python wrapper:
```sh
pip install pytesseract
```

### 5.2 Install Chinese language pack (chi_sim)

Tesseract's default install only includes English. For Chinese PDFs, download the language pack:

```sh
# Create writable tessdata directory (Program Files needs admin)
mkdir -p ~/tessdata
# Standard model (faster, ~44MB)
curl.exe -L -o ~/tessdata/chi_sim.traineddata "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/chi_sim.traineddata"
# Best model (more accurate, ~13MB) — recommended for Chinese documents
curl.exe -L -o ~/tessdata/chi_sim_best.traineddata "https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/chi_sim.traineddata"
# Copy English pack too (for mixed chi_sim+eng OCR)
cp "C:\Program Files\Tesseract-OCR\tessdata\eng.traineddata" ~/tessdata/
```

Set `TESSDATA_PREFIX` environment variable to the tessdata directory before running OCR:
```sh
$env:TESSDATA_PREFIX = "$env:USERPROFILE\tessdata"
```

### 5.3 Convert PDF pages to images and run OCR

```python
import fitz
import pytesseract
from PIL import Image

# Set tesseract path and tessdata location
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

doc = fitz.open(r"<pdf-path>")
for i, page in enumerate(doc):
    # 300 DPI recommended for OCR; increase to 400 if recognition is poor
    pix = page.get_pixmap(dpi=300)
    pix.save(f"page_{i+1}.png")
    img = Image.open(f"page_{i+1}.png")
    # Use chi_sim_best for better Chinese accuracy; --psm 6 for uniform text blocks
    text = pytesseract.image_to_string(img, lang="chi_sim_best+eng", config="--psm 6")
    print(f"--- Page {i+1} ---")
    print(text)
```

If Chinese recognition is still poor with the standard model, switch to `chi_sim_best` (more accurate). If OCR output is garbled even with best model, the PDF may have rendering issues — try 400 DPI, or offer to extract page images for visual reading via `read_image` (requires an image-capable model).

If no OCR tool can be installed, tell the user the PDF is image-based and offer to extract page images instead.

## Step 6 — Extract images (optional)

If the user needs images embedded in the PDF:

```python
import fitz
doc = fitz.open(r"<pdf-path>")
for i, page in enumerate(doc):
    for j, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        pix.save(f"img_p{i+1}_{j+1}.png")
```

## Step 7 — Extract metadata

```python
import fitz
doc = fitz.open(r"<pdf-path>")
print(doc.metadata)
```

## Windows sandbox note

On Windows hosts where the file sandbox fails to initialize with `SetNamedSecurityInfoW` errors under `workspace-write` mode, Python commands may need `danger-full-access` sandbox permission. Retry the exact same command with `sandbox_permissions: "danger-full-access"` and a one-sentence justification if a `workspace-write` attempt is denied.

## Output handling

- For short PDFs (< 10 pages): print extracted text directly so the user sees it inline.
- For long PDFs (>= 10 pages): write extracted text to a `.txt` or `.md` file in the workspace and present the file path so the user can open it.
- Always report: total pages, whether tables were found, whether OCR was used, and any pages that failed extraction.
