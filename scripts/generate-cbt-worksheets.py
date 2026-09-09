#!/usr/bin/env python3
"""Reproducible original FTT worksheets; reuse the project's OOXML/PDF infrastructure.

compact_reference_guide preset, restrained memo_masthead title stack.
Named overrides: form prompt 11 pt bold with 3 pt after; response lines 22 pt;
FTT title 22 pt; explicit page breaks separate reflection, plan, and review.
Only Python's standard library is needed, as in generate-resource-exports.py.
"""
from pathlib import Path
import importlib.util
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site/resources/free-therapy-tools/cbt"
spec = importlib.util.spec_from_file_location("resource_exports", Path(__file__).with_name("generate-resource-exports.py"))
exports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exports)

PAGES = [
    ("Notice the pattern", [
        "Situation I have been avoiding:", "What makes this difficult?",
        "What am I predicting?", "What thoughts are getting in the way?",
        "What parts are possible to change?", "What does avoiding it help with right now?",
    ]),
    ("Choose an approach", [
        "What does avoidance cost over time?", "What would I like to be able to do?",
        "A successful-enough outcome would look like:", "One small, safe approach step:",
        "What could help me try it?", "When and where could I practise?",
    ]),
    ("After trying", [
        "Date and situation:", "What did I do?", "What happened?",
        "How did I feel?", "What did I cope with or learn?", "What is the next useful step?",
    ]),
]
TITLE = "Avoidance & Approach Planner"
FOOTER = "Original Free Therapy Tools practice sheet"
NOTES = [
    "Choose one situation. Notice what avoidance does now and over time.",
    "Respect real safety, consent, legal limits, health needs, and accessibility supports.",
    "Review both action and feeling. Anxiety does not have to decrease for practice to be useful.",
]

def build():
    OUT.mkdir(parents=True, exist_ok=True)
    record = {"title": TITLE, "resource_id": "ftt-avoidance-approach", "blocks": [], "fields": []}
    files = exports.docx_files(record)
    body = []
    pdf = exports.PdfCanvas()
    for page, (heading, prompts) in enumerate(PAGES):
        if page:
            body.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
            pdf.new_page()
        body.extend([exports.w_paragraph(TITLE, style="TSKTitle"), exports.w_paragraph(heading, style="Heading1"), exports.w_paragraph(NOTES[page])])
        pdf.text(TITLE, size=22, bold=True, after=5)
        pdf.text(heading, size=16, bold=True, after=8)
        pdf.text(NOTES[page], size=11, after=18)
        for label in prompts:
            body.append(exports.w_paragraph(label, style="FormPrompt", keep_next=True))
            for _ in range(2):
                body.append(exports.w_paragraph(" ", style="ResponseLine", border_bottom=True))
            pdf.text(label, size=11, bold=True, after=14)
            pdf.line(gap=23)
            pdf.line(gap=26)
        pdf.page.append(f'BT /F1 9 Tf 54 32 Td ({FOOTER} - {page + 1} / 3) Tj ET')
    section = '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708"/></w:sectPr>'
    files["word/document.xml"] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + "".join(body) + section + '</w:body></w:document>'
    files["word/styles.xml"] = files["word/styles.xml"].replace('</w:styles>', '<w:style w:type="paragraph" w:styleId="FormPrompt"><w:name w:val="Form prompt"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="60" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ResponseLine"><w:name w:val="Response line"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="0" w:line="440" w:lineRule="exact"/></w:pPr></w:style></w:styles>')
    files["word/footer1.xml"] = '<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="596273"/></w:rPr><w:t>' + FOOTER + ' | Page </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>'
    files["docProps/core.xml"] = files["docProps/core.xml"].replace("Therapy Skill Kit worksheet", TITLE.replace("&", "&amp;")).replace("Therapy Skill Kit", "Free Therapy Tools")
    stem = OUT / "avoidance-and-approach-planner"
    with zipfile.ZipFile(stem.with_suffix(".docx"), "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content.encode("utf-8"))
    exports.write_pdf_pages(stem.with_suffix(".pdf"), ["\n".join(page) for page in pdf.pages])
    print(f"Generated {stem}.pdf and .docx ({len(pdf.pages)} PDF pages)")

if __name__ == "__main__":
    build()
