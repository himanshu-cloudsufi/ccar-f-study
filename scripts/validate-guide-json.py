#!/usr/bin/env python3
"""Validate a generated guide block-document against its Markdown source.

Checks the schema (block/span shapes) and, more importantly, that no prose was
lost or invented in the conversion: every word-run in the Markdown must survive
into some span, and vice versa.

Usage: python3 scripts/validate-guide-json.py [<name> ...]
       (no args = every pair in src/content/blocks/)
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD = ROOT / "src/content"
JS = ROOT / "src/content/blocks"

SPAN_TYPES = {"text", "strong", "em", "code", "link"}
BLOCK_TYPES = {
    "heading", "paragraph", "definition", "callout",
    "list", "table", "code", "divider", "quiz",
}


def fail(errs, msg):
    errs.append(msg)


MERGEABLE = {"text", "strong", "em", "code"}


def check_spans(spans, where, errs):
    if not isinstance(spans, list):
        return fail(errs, f"{where}: spans must be a list")
    for i, s in enumerate(spans):
        # Two same-type spans in a row should be one span — split pairs render as
        # two adjacent <code> boxes instead of one string.
        if i and isinstance(s, dict) and isinstance(spans[i - 1], dict):
            if s.get("t") == spans[i - 1].get("t") and s.get("t") in MERGEABLE:
                fail(
                    errs,
                    f"{where}[{i}]: adjacent {s['t']} spans should be merged: "
                    f"{spans[i - 1].get('v', '')[:20]!r} + {s.get('v', '')[:20]!r}",
                )
        at = f"{where}[{i}]"
        if not isinstance(s, dict):
            fail(errs, f"{at}: span must be an object")
            continue
        if s.get("t") not in SPAN_TYPES:
            fail(errs, f"{at}: bad span type {s.get('t')!r}")
        if not isinstance(s.get("v"), str):
            fail(errs, f"{at}: span 'v' must be a string")
        if s.get("t") == "link" and not isinstance(s.get("href"), str):
            fail(errs, f"{at}: link span needs an href")
        # A code span may legitimately contain ** (glob patterns like **/*.test.tsx),
        # so only prose spans are checked for leftover Markdown markers.
        v = s.get("v", "")
        if s.get("t") != "code" and ("**" in v or "`" in v):
            fail(errs, f"{at}: unstripped markdown in span text: {v[:40]!r}")


def check_items(items, where, errs):
    if not isinstance(items, list) or not items:
        return fail(errs, f"{where}: list needs a non-empty items array")
    for i, it in enumerate(items):
        at = f"{where}.items[{i}]"
        if not isinstance(it, dict):
            fail(errs, f"{at}: item must be an object")
            continue
        check_spans(it.get("spans"), at, errs)
        if it.get("marker") not in ("none", "do", "dont"):
            fail(errs, f"{at}: bad marker {it.get('marker')!r}")
        kids = it.get("children", [])
        if not isinstance(kids, list):
            fail(errs, f"{at}: children must be a list")
        elif kids:
            check_items(kids, at, errs)


def check_schema(doc, errs):
    for k in ("id", "title", "blocks"):
        if k not in doc:
            fail(errs, f"document missing {k!r}")
    if not isinstance(doc.get("blocks"), list) or not doc["blocks"]:
        return fail(errs, "blocks must be a non-empty list")
    for i, b in enumerate(doc["blocks"]):
        at = f"blocks[{i}]"
        t = b.get("type")
        if t not in BLOCK_TYPES:
            fail(errs, f"{at}: unknown block type {t!r}")
            continue
        if t == "heading":
            if b.get("level") not in (2, 3, 4):
                fail(errs, f"{at}: heading level must be 2-4, got {b.get('level')!r}")
            check_spans(b.get("spans"), at, errs)
        elif t in ("paragraph", "callout"):
            check_spans(b.get("spans"), at, errs)
            if t == "callout" and b.get("variant") not in ("principle", "note"):
                fail(errs, f"{at}: bad callout variant {b.get('variant')!r}")
        elif t == "definition":
            check_spans(b.get("term"), at + ".term", errs)
            check_spans(b.get("spans"), at, errs)
        elif t == "list":
            if not isinstance(b.get("ordered"), bool):
                fail(errs, f"{at}: list needs a boolean 'ordered'")
            check_items(b.get("items"), at, errs)
        elif t == "table":
            cols = b.get("columns")
            if not isinstance(cols, list) or not cols:
                fail(errs, f"{at}: table needs columns")
            else:
                for j, c in enumerate(cols):
                    check_spans(c, f"{at}.columns[{j}]", errs)
                for r, row in enumerate(b.get("rows") or []):
                    if not isinstance(row, list) or len(row) != len(cols):
                        fail(errs, f"{at}.rows[{r}]: has {len(row) if isinstance(row, list) else '?'} cells, expected {len(cols)}")
                        continue
                    for c, cell in enumerate(row):
                        check_spans(cell, f"{at}.rows[{r}][{c}]", errs)
        elif t == "code":
            if not isinstance(b.get("code"), str) or not b["code"]:
                fail(errs, f"{at}: code block needs a non-empty 'code' string")
            if not isinstance(b.get("lang"), str):
                fail(errs, f"{at}: code block needs a 'lang' string")
        elif t == "quiz":
            check_spans(b.get("prompt"), at + ".prompt", errs)
            check_spans(b.get("explanation"), at + ".explanation", errs)
            opts = b.get("options")
            if not isinstance(opts, list) or len(opts) < 2:
                fail(errs, f"{at}: quiz needs at least 2 options")
            else:
                for j, o in enumerate(opts):
                    check_spans(o, f"{at}.options[{j}]", errs)
                if not isinstance(b.get("answer"), int) or not 0 <= b["answer"] < len(opts):
                    fail(errs, f"{at}: answer {b.get('answer')!r} out of range")


def words(text):
    text = unicodedata.normalize("NFKD", text).lower()
    return re.findall(r"[a-z0-9]+", text)


def md_prose(src):
    """Markdown minus its syntax, as a word list."""
    out, in_fence = [], False
    for line in src.split("\n"):
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.strip() == "---":
            continue
        if re.match(r"^\|[\s:|-]+\|$", line.strip()):
            continue
        line = re.sub(r"^#{1,6}\s+", "", line)
        line = re.sub(r"^>\s?", "", line)
        line = re.sub(r"^\s*[-*]\s+", "", line)
        line = re.sub(r"^\s*\d+\.\s+", "", line)
        line = line.replace("|", " ")
        line = re.sub(r"\*\*|`|(?<![a-z0-9])\*|\*(?![a-z0-9])", "", line)
        out += words(line)
    return out


def json_prose(doc):
    # title/subtitle live on the document, not in blocks, but they are prose from
    # the Markdown's point of view (its H1 and the H2 under it).
    out = words(doc.get("title") or "") + words(doc.get("subtitle") or "")

    def spans(sp):
        for s in sp or []:
            out.extend(words(s.get("v", "")))

    def items(its):
        for it in its or []:
            spans(it.get("spans"))
            items(it.get("children"))

    for b in doc["blocks"]:
        t = b["type"]
        if t in ("heading", "paragraph", "callout"):
            spans(b.get("spans"))
        elif t == "definition":
            spans(b.get("term"))
            out.append("__colon__")
            spans(b.get("spans"))
        elif t == "list":
            items(b.get("items"))
        elif t == "table":
            for c in b.get("columns") or []:
                spans(c)
            for row in b.get("rows") or []:
                for cell in row:
                    spans(cell)
        elif t == "quiz":
            out.extend(words(b.get("qid", "")))
            spans(b.get("prompt"))
            for o in b.get("options") or []:
                spans(o)
            out.extend(words("Answer " + "ABCDEFGH"[b["answer"]]))
            spans(b.get("explanation"))
    return [w for w in out if w != "__colon__"]


def code_blocks(src):
    return re.findall(r"^```[^\n]*\n(.*?)^```", src, re.S | re.M)


def diff_runs(a, b, label, errs, limit=6):
    """Report contiguous runs present in `a` but not aligned in `b`."""
    import difflib
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    runs = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ("delete", "replace") and i2 - i1 >= 3:
            runs.append(" ".join(a[i1:i2]))
    for r in runs[:limit]:
        fail(errs, f"{label}: {r[:120]}")
    if len(runs) > limit:
        fail(errs, f"{label}: …and {len(runs) - limit} more runs")


def validate(name):
    errs = []
    md_path = MD / f"{name}.md"
    js_path = JS / f"{name}.json"
    if not js_path.exists():
        return [f"{js_path.name} does not exist"]
    try:
        doc = json.loads(js_path.read_text())
    except json.JSONDecodeError as e:
        return [f"invalid JSON: {e}"]
    check_schema(doc, errs)
    if errs:
        return errs

    src = md_path.read_text()
    h1 = re.search(r"^# (.+)$", src, re.M)
    if h1 and doc["title"].strip() != h1.group(1).strip():
        fail(errs, f"title mismatch: {doc['title']!r} vs {h1.group(1)!r}")

    mw, jw = md_prose(src), json_prose(doc)
    diff_runs(mw, jw, "LOST from markdown", errs)
    diff_runs(jw, mw, "INVENTED in json", errs)

    md_code = [c.strip() for c in code_blocks(src)]
    js_code = [b["code"].strip() for b in doc["blocks"] if b["type"] == "code"]
    if len(md_code) != len(js_code):
        fail(errs, f"code blocks: {len(md_code)} in md, {len(js_code)} in json")
    else:
        for i, (a, b) in enumerate(zip(md_code, js_code)):
            if a != b:
                fail(errs, f"code block {i} differs from source")

    md_tables = len(re.findall(r"^\|[\s:|-]+\|$", src, re.M))
    js_tables = sum(1 for b in doc["blocks"] if b["type"] == "table")
    if md_tables != js_tables:
        fail(errs, f"tables: {md_tables} in md, {js_tables} in json")

    md_q = len(re.findall(r"^\*\*Q\d+\.\*\*", src, re.M))
    js_q = sum(1 for b in doc["blocks"] if b["type"] == "quiz")
    if md_q != js_q:
        fail(errs, f"quiz questions: {md_q} in md, {js_q} in json")

    return errs


def main():
    names = sys.argv[1:] or sorted(p.stem for p in MD.glob("*.md"))
    bad = 0
    for n in names:
        errs = validate(n)
        if errs:
            bad += 1
            print(f"✗ {n}")
            for e in errs:
                print(f"    {e}")
        else:
            print(f"✓ {n}")
    print(f"\n{len(names) - bad}/{len(names)} valid")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
