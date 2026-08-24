#!/usr/bin/env python3
"""Generate deterministic blank paraphrased DOCX/PDF worksheets incrementally."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
import textwrap
import zipfile
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

import resource_paraphrases as rp


PUBLIC_OUTPUT = rp.SITE / "assets" / "paraphrased-resources"
MANIFEST_NAME = "manifest.json"
TEMPLATE_VERSION = "compact-reference-guide-v1"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def artifact_hash(record: dict[str, Any]) -> str:
    payload = {
        "template": TEMPLATE_VERSION,
        "resource_id": record["resource_id"],
        "title": record["title"],
        "blocks": record["blocks"],
        "fields": record["fields"],
        "source_hash": record["source"]["source_hash"],
    }
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def w_text(text: str, *, bold: bool = False, size: int | None = None) -> str:
    props = []
    if bold:
        props.append("<w:b/>")
    if size:
        props.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    value = escape(text)
    return f"<w:r><w:rPr>{''.join(props)}</w:rPr><w:t xml:space=\"preserve\">{value}</w:t></w:r>"


def w_paragraph(text: str = "", *, style: str = "Normal", before: int | None = None, after: int | None = None, keep_next: bool = False, num_id: int | None = None, border_bottom: bool = False) -> str:
    props = [f'<w:pStyle w:val="{style}"/>']
    if before is not None or after is not None:
        props.append(f'<w:spacing w:before="{before or 0}" w:after="{after or 0}"/>')
    if keep_next:
        props.append("<w:keepNext/>")
    if num_id is not None:
        props.append(f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_id}"/></w:numPr>')
    if border_bottom:
        props.append('<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="6" w:color="B4BBC5"/></w:pBdr>')
    return f"<w:p><w:pPr>{''.join(props)}</w:pPr>{w_text(text)}</w:p>"


def w_cell(text: str, width: int, *, bold: bool = False, fill: str | None = None) -> str:
    shading = f'<w:shd w:val="clear" w:fill="{fill}"/>' if fill else ""
    margins = '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:start w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar>'
    return f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shading}{margins}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>{w_text(text, bold=bold)}</w:p></w:tc>'


def w_table(headers: list[str], rows: int) -> str:
    count = max(1, len(headers))
    base = 9360 // count
    widths = [base] * count
    widths[-1] += 9360 - sum(widths)
    grid = "".join(f'<w:gridCol w:w="{width}"/>' for width in widths)
    borders = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="AEB6C2"/><w:left w:val="single" w:sz="4" w:color="AEB6C2"/><w:bottom w:val="single" w:sz="4" w:color="AEB6C2"/><w:right w:val="single" w:sz="4" w:color="AEB6C2"/><w:insideH w:val="single" w:sz="4" w:color="AEB6C2"/><w:insideV w:val="single" w:sz="4" w:color="AEB6C2"/></w:tblBorders>'
    props = f'<w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/><w:tblLayout w:type="fixed"/>{borders}</w:tblPr><w:tblGrid>{grid}</w:tblGrid>'
    header = '<w:tr><w:trPr><w:tblHeader/></w:trPr>' + "".join(w_cell(value, widths[index], bold=True, fill="E8EEF5") for index, value in enumerate(headers)) + "</w:tr>"
    body = "".join('<w:tr>' + "".join(w_cell("\u00a0\n\n", width) for width in widths) + "</w:tr>" for _ in range(rows))
    return f"<w:tbl>{props}{header}{body}</w:tbl>"


def field_docx(field: dict[str, Any]) -> str:
    parts = [w_paragraph(field["label"], style="Heading2", keep_next=True)]
    if field.get("help"):
        parts.append(w_paragraph(field["help"], style="HelpText"))
    kind = field["type"]
    if kind in {"checkbox", "multi-select", "yes-no", "single-choice"}:
        choices = field.get("choices") or (["Yes", "No"] if kind == "yes-no" else [])
        parts.extend(w_paragraph(f"☐ {choice}", style="Choice") for choice in choices)
    elif kind == "rating-scale":
        values = [str(value) for value in range(int(field["min"]), int(field["max"]) + 1)]
        if len(values) <= 11:
            parts.append(w_table(values, 1))
        else:
            parts.append(w_paragraph(f"Rating range: {field['min']} to {field['max']}", style="HelpText"))
            parts.extend(w_paragraph("", border_bottom=True) for _ in range(2))
    elif kind == "table":
        parts.append(w_table(field.get("columns") or ["Item", "My response"], int(field.get("rows", 4))))
    elif kind == "repeating-rows":
        for _ in range(int(field.get("rows", 4))):
            parts.append(w_paragraph("", border_bottom=True))
    elif kind in {"reflection", "textarea", "planning", "other"}:
        parts.extend(w_paragraph("", border_bottom=True) for _ in range(4))
    else:
        parts.extend(w_paragraph("", border_bottom=True) for _ in range(2))
    return "".join(parts)


def document_xml(record: dict[str, Any]) -> str:
    body = [w_paragraph(record["title"], style="TSKTitle"), w_paragraph(f"Resource ID: {record['resource_id']}", style="Subtitle")]
    for block in record["blocks"]:
        if block["type"] == "heading":
            body.append(w_paragraph(block["text"], style="Heading1", keep_next=True))
        elif block["type"] == "bullet":
            body.append(w_paragraph(block["text"], num_id=1))
        elif block["type"] == "numbered":
            body.append(w_paragraph(block["text"], num_id=2))
        elif block["type"] == "note":
            body.append(w_paragraph(block["text"], style="HelpText"))
        else:
            body.append(w_paragraph(block["text"]))
    body.append(w_paragraph("Worksheet", style="Heading1", keep_next=True))
    body.extend(field_docx(field) for field in record["fields"])
    body.append(w_paragraph("Source and adaptation note", style="Heading1", keep_next=True))
    body.append(w_paragraph("This project-authored plain-language worksheet is adapted from the source handout linked on the corresponding Therapy Skill Kit lesson page. The source remains available for context and retains its original rights. This worksheet does not replace professional care.", style="HelpText"))
    section = '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708"/></w:sectPr>'
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + "".join(body) + section + "</w:body></w:document>"


def styles_xml() -> str:
    # compact_reference_guide preset: Calibri 11 pt, 6 pt after, 1.25 line;
    # H1 16/18/10, H2 13/14/7, H3 12/10/5, fixed Letter geometry.
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TSKTitle"><w:name w:val="Therapy Skill Kit Title"/><w:basedOn w:val="Normal"/><w:next w:val="Subtitle"/><w:pPr><w:spacing w:before="0" w:after="160"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="0B2545"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="596273"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="200"/></w:pPr><w:rPr><w:b/><w:color w:val="2E74B5"/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="140"/></w:pPr><w:rPr><w:b/><w:color w:val="2E74B5"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4D78"/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="HelpText"><w:name w:val="Help Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="100"/></w:pPr><w:rPr><w:color w:val="596273"/><w:i/><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Choice"><w:name w:val="Choice"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/><w:ind w:left="260"/></w:pPr></w:style>
</w:styles>'''


def numbering_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="270"/><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="270"/><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num></w:numbering>'''


def footer_xml(record: dict[str, Any]) -> str:
    label = escape(f"Therapy Skill Kit · {record['resource_id']}")
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:color w:val="777777"/><w:sz w:val="18"/></w:rPr><w:t>{label} · Page </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>'''


def docx_files(record: dict[str, Any]) -> dict[str, str]:
    return {
        "[Content_Types].xml": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>''',
        "_rels/.rels": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>''',
        "word/_rels/document.xml.rels": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>''',
        "word/document.xml": document_xml(record), "word/styles.xml": styles_xml(),
        "word/numbering.xml": numbering_xml(), "word/footer1.xml": footer_xml(record),
        "docProps/core.xml": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Therapy Skill Kit worksheet</dc:title><dc:creator>Therapy Skill Kit</dc:creator></cp:coreProperties>''',
    }


def write_docx(path: Path, record: dict[str, Any]) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(docx_files(record).items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o600 << 16
            archive.writestr(info, content.encode("utf-8"))


def pdf_escape(text: str) -> str:
    value = text.encode("latin-1", errors="replace").decode("latin-1")
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class PdfCanvas:
    def __init__(self) -> None:
        self.pages: list[list[str]] = [[]]
        self.y = 738.0

    @property
    def page(self) -> list[str]:
        return self.pages[-1]

    def new_page(self) -> None:
        self.pages.append([])
        self.y = 738.0

    def ensure(self, height: float) -> None:
        if self.y - height < 58:
            self.new_page()

    def text(self, text: str, *, size: float = 10.5, bold: bool = False, indent: float = 0, after: float = 5, max_chars: int | None = None) -> None:
        width = max_chars or max(24, int((504 - indent) / (size * .52)))
        lines = textwrap.wrap(text.replace("\n", " "), width=width, break_long_words=False, break_on_hyphens=False) or [""]
        line_height = size * 1.28
        self.ensure(line_height * len(lines) + after)
        font = "/F2" if bold else "/F1"
        for line in lines:
            self.page.append(f"BT {font} {size:.1f} Tf {54 + indent:.1f} {self.y:.1f} Td ({pdf_escape(line)}) Tj ET")
            self.y -= line_height
        self.y -= after

    def line(self, *, indent: float = 0, width: float = 504, gap: float = 16) -> None:
        self.ensure(gap + 2)
        self.page.append(f"0.65 G 0.5 w {54 + indent:.1f} {self.y:.1f} m {54 + indent + width:.1f} {self.y:.1f} l S")
        self.y -= gap

    def boxes(self, labels: list[str]) -> None:
        for label in labels:
            self.ensure(22)
            self.page.append(f"0.3 G 0.7 w 56 {self.y - 2:.1f} 10 10 re S")
            self.page.append(f"BT /F1 10.0 Tf 72 {self.y:.1f} Td ({pdf_escape(label)}) Tj ET")
            self.y -= 20
        self.y -= 3

    def table(self, headers: list[str], rows: int) -> None:
        columns = max(1, len(headers)); width = 504 / columns; row_height = 30
        total = row_height * (rows + 1)
        self.ensure(total + 8)
        top = self.y
        self.page.append("0.75 G 0.5 w")
        for row in range(rows + 2):
            y = top - row * row_height
            self.page.append(f"54 {y:.1f} m 558 {y:.1f} l S")
        for column in range(columns + 1):
            x = 54 + column * width
            self.page.append(f"{x:.1f} {top:.1f} m {x:.1f} {top - total:.1f} l S")
        for index, header in enumerate(headers):
            short = textwrap.shorten(header, width=max(8, int(width / 6)), placeholder="...")
            self.page.append(f"BT /F2 8.5 Tf {58 + index * width:.1f} {top - 18:.1f} Td ({pdf_escape(short)}) Tj ET")
        self.y = top - total - 8


def pdf_content(record: dict[str, Any]) -> list[str]:
    canvas = PdfCanvas()
    canvas.text(record["title"], size=20, bold=True, after=4)
    canvas.text(f"Therapy Skill Kit · Resource ID: {record['resource_id']}", size=9, after=14)
    for block in record["blocks"]:
        if block["type"] == "heading": canvas.text(block["text"], size=14, bold=True, after=5)
        elif block["type"] == "bullet": canvas.text("- " + block["text"], indent=10)
        elif block["type"] == "numbered": canvas.text(block["text"], indent=10)
        elif block["type"] == "note": canvas.text("Note: " + block["text"], size=9, after=7)
        else: canvas.text(block["text"], after=7)
    canvas.text("Worksheet", size=16, bold=True, after=8)
    for field in record["fields"]:
        canvas.text(field["label"], size=11, bold=True, after=3)
        if field.get("help"): canvas.text(field["help"], size=8.5, after=4)
        kind = field["type"]
        if kind in {"checkbox", "multi-select", "yes-no", "single-choice"}:
            canvas.boxes(field.get("choices") or (["Yes", "No"] if kind == "yes-no" else []))
        elif kind == "rating-scale":
            values = list(range(int(field["min"]), int(field["max"]) + 1))
            if len(values) <= 11: canvas.table([str(value) for value in values], 1)
            else: canvas.text(f"Rating: {field['min']} to {field['max']}", size=9); canvas.line(); canvas.line()
        elif kind == "table": canvas.table(field.get("columns") or ["Item", "My response"], int(field.get("rows", 4)))
        elif kind == "repeating-rows":
            for _ in range(int(field.get("rows", 4))): canvas.line()
        elif kind in {"reflection", "textarea", "planning", "other"}:
            for _ in range(4): canvas.line()
        else:
            for _ in range(2): canvas.line()
    canvas.text("Source and adaptation note", size=13, bold=True, after=4)
    canvas.text("This project-authored plain-language worksheet is adapted from the source handout linked on the corresponding Therapy Skill Kit lesson page. The source remains available for context and retains its original rights. This worksheet does not replace professional care.", size=8.5)
    return ["\n".join(page) for page in canvas.pages]


def write_pdf(path: Path, record: dict[str, Any]) -> None:
    contents = pdf_content(record)
    objects: list[bytes] = []
    def add(value: str | bytes) -> int:
        objects.append(value.encode("latin-1") if isinstance(value, str) else value)
        return len(objects)
    font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    pages_id = 3
    page_ids = []
    content_ids = []
    for content in contents:
        data = content.encode("latin-1", errors="replace")
        content_ids.append(add(b"<< /Length " + str(len(data)).encode() + b" >>\nstream\n" + data + b"\nendstream"))
        page_ids.append(add("PENDING"))
    # Inserting the pages object shifts every previously allocated ID >= 3.
    page_ids = [value + 1 for value in page_ids]
    content_ids = [value + 1 for value in content_ids]
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects.insert(2, f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("latin-1"))
    for page_id, content_id in zip(page_ids, content_ids):
        objects[page_id - 1] = f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> /Contents {content_id} 0 R >>".encode("latin-1")
    catalog_id = add(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    chunks = [header]
    offsets = [0]
    size = len(header)
    for object_id, obj in enumerate(objects, 1):
        offsets.append(size)
        chunk = f"{object_id} 0 obj\n".encode() + obj + b"\nendobj\n"
        chunks.append(chunk); size += len(chunk)
    xref = [f"xref\n0 {len(objects) + 1}\n", "0000000000 65535 f \n"]
    xref.extend(f"{offset:010d} 00000 n \n" for offset in offsets[1:])
    trailer = f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{size}\n%%EOF\n"
    chunks.append("".join(xref).encode() + trailer.encode())
    path.write_bytes(b"".join(chunks))


def validate_docx(path: Path, record: dict[str, Any]) -> list[str]:
    errors = []
    if not path.is_file() or path.stat().st_size == 0: return [f"{record['resource_id']}: DOCX missing or empty"]
    try:
        with zipfile.ZipFile(path) as archive:
            required = {"[Content_Types].xml", "word/document.xml", "word/styles.xml", "word/numbering.xml"}
            if not required.issubset(archive.namelist()): errors.append(f"{record['resource_id']}: incomplete DOCX package")
            document = archive.read("word/document.xml").decode("utf-8")
            if escape(record["title"]) not in document: errors.append(f"{record['resource_id']}: DOCX title missing")
            if record["resource_id"] not in document: errors.append(f"{record['resource_id']}: DOCX resource ID missing")
            for field in record["fields"]:
                if escape(field["label"]) not in document: errors.append(f"{record['resource_id']}: DOCX prompt missing {field['id']}")
    except (OSError, KeyError, zipfile.BadZipFile) as error:
        errors.append(f"{record['resource_id']}: invalid DOCX: {error}")
    return errors


def validate_pdf(path: Path, record: dict[str, Any]) -> list[str]:
    errors = []
    if not path.is_file() or path.stat().st_size == 0: return [f"{record['resource_id']}: PDF missing or empty"]
    data = path.read_bytes()
    if not data.startswith(b"%PDF"): errors.append(f"{record['resource_id']}: invalid PDF header")
    if f"Resource ID: {record['resource_id']}".encode("latin-1") not in data: errors.append(f"{record['resource_id']}: PDF resource ID missing")
    if data.count(b"/Type /Page ") < 1: errors.append(f"{record['resource_id']}: PDF has no pages")
    return errors


def select_records(corpus: dict[str, Any], include_drafts: bool) -> list[dict[str, Any]]:
    return [record for record in corpus["records"] if record["has_input"] and (include_drafts or record["status"] in rp.PUBLIC_STATES)]


def generate(corpus: dict[str, Any], output: Path, *, all_records: bool, include_drafts: bool, dry_run: bool) -> dict[str, Any]:
    selected = select_records(corpus, include_drafts)
    manifest_path = output / MANIFEST_NAME
    previous = rp.load_json(manifest_path) if manifest_path.is_file() else {"artifacts": {}}
    current: dict[str, Any] = {}
    generated = skipped = 0
    errors = []
    for record in selected:
        digest = artifact_hash(record)
        docx = output / f"{record['resource_id']}.docx"
        pdf = output / f"{record['resource_id']}.pdf"
        unchanged = previous.get("artifacts", {}).get(record["resource_id"], {}).get("hash") == digest and docx.is_file() and pdf.is_file()
        if unchanged and not all_records:
            skipped += 1
        else:
            generated += 1
            if not dry_run:
                output.mkdir(parents=True, exist_ok=True)
                write_docx(docx, record); write_pdf(pdf, record)
        if not dry_run:
            errors.extend(validate_docx(docx, record)); errors.extend(validate_pdf(pdf, record))
        current[record["resource_id"]] = {"hash": digest, "docx": docx.name, "pdf": pdf.name}
    if not dry_run:
        output.mkdir(parents=True, exist_ok=True)
        if output.resolve() == PUBLIC_OUTPUT.resolve():
            expected = {f"{record['resource_id']}.{extension}" for record in selected for extension in ("docx", "pdf")}
            for path in output.iterdir():
                if path.suffix.lower() in {".docx", ".pdf"} and path.name not in expected:
                    path.unlink()
        manifest = {"schema_version": 1, "template_version": TEMPLATE_VERSION, "artifacts": dict(sorted(current.items()))}
        manifest_path.write_text(rp.stable_json(manifest), encoding="utf-8", newline="\n")
    return {"selected": len(selected), "generated": generated, "skipped": skipped, "docx": len(selected), "pdf": len(selected), "errors": errors}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--changed", action="store_true")
    mode.add_argument("--all", action="store_true")
    parser.add_argument("--include-drafts", action="store_true", help="Generate review-only draft artifacts outside the public site")
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    output = args.output_dir or (rp.ROOT / "tmp" / "resource-paraphrase-draft-exports" if args.include_drafts else PUBLIC_OUTPUT)
    if args.include_drafts and output.resolve().is_relative_to(rp.SITE.resolve()):
        print("Refusing to place draft exports inside the public site", file=sys.stderr)
        return 2
    corpus = rp.load_json(rp.CANONICAL)
    errors = rp.validate_corpus(corpus)
    if errors:
        print("\n".join(errors), file=sys.stderr); return 2
    summary = generate(corpus, output, all_records=args.all, include_drafts=args.include_drafts, dry_run=args.dry_run)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 2 if summary["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
