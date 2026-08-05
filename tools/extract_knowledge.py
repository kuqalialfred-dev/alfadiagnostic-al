from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from docx import Document


WORKSPACE = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).resolve().parents[1] / "backend" / "SeedData" / "knowledge-pages.json"

FOLDERS = {
    "1. Mykologjia": ("Infeksionet", "Mikologji"),
    "2. Bakterologji": ("Infeksionet", "Bakteriologji"),
    "3. Parazitologji": ("Infeksionet", "Parazitologji"),
    "4. Virologji": ("Infeksionet", "Virologji"),
}

CATALOGUES = {
    "5. Analiza Klinike": ("Analizat", "Analiza Klinike"),
    "6. Biokimi": ("Analizat", "Biokimi"),
    "7. Hormonet": ("Analizat", "Hormonet"),
    "8. Imunologji": ("Analizat", "Imunologjia"),
}

ABOUT_FILES = {
    "1. Historia.docx": ("Laboratori Alfa", "Historia"),
    "2. Misioni.docx": ("Laboratori Alfa", "Misioni"),
    "3. Vlerat tona.docx": ("Laboratori Alfa", "Vlerat tona"),
    "4. Ekipi.docx": ("Laboratori Alfa", "Ekipi"),
    "5. Pse të zgjidhni Laboratorin Alfa.docx": ("Laboratori Alfa", "Pse të zgjidhni Laboratorin Alfa?"),
    "Shërbimet Laboratorike.docx": ("Laboratori Alfa", "Shërbimet Laboratorike"),
}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", ascii_value)).strip("-")


def filename_title(path: Path, fallback: str) -> str:
    stem = path.stem
    stem = re.sub(r"^\d+(?:\.\d+)*\s*[–-]\s*", "", stem)
    return stem if stem != path.stem or len(fallback) < 5 else fallback


def paragraphs(path: Path) -> list[str]:
    document = Document(path)
    return [p.text.strip() for p in document.paragraphs if p.text and p.text.strip()]


def make_page(path: Path, category: str, section: str, body: list[str], title_override: str | None = None, trim_to_heading: bool = False) -> dict:
    fallback = body[0] if body else path.stem
    title = title_override or filename_title(path, fallback)
    if trim_to_heading and section in body:
        body = body[body.index(section) + 1:]
    elif len(path.parts) > 1 and body:
        body = body[1:]
    elif body and body[0] == title:
        body = body[1:]
    body_text = "\n\n".join(body).strip()
    relative = path.relative_to(WORKSPACE).as_posix()
    return {
        "slug": slugify(relative.removesuffix(".docx")),
        "title": title,
        "category": category,
        "section": section,
        "body": body_text,
        "sourceName": relative,
    }


pages: list[dict] = []
for source in sorted(WORKSPACE.rglob("*.docx")):
    if "website" in source.parts or source.name.startswith("~$"):
        continue
    relative = source.relative_to(WORKSPACE)
    try:
        body = paragraphs(source)
    except Exception:
        continue
    if not body:
        continue
    top = relative.parts[0]
    if top in FOLDERS:
        category, discipline = FOLDERS[top]
        section = relative.parts[1] if len(relative.parts) > 2 else discipline
        pages.append(make_page(source, category, f"{discipline} · {section}", body))
    elif top in CATALOGUES:
        category, section = CATALOGUES[top]
        pages.append(make_page(source, category, section, body))
    elif relative.as_posix() in ABOUT_FILES:
        category, section = ABOUT_FILES[relative.as_posix()]
        pages.append(make_page(source, category, section, body, title_override=section, trim_to_heading=True))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Generated {len(pages)} pages in {OUTPUT}")
