# Scenario 6: Structured Data Extraction
## CCAR-F Deep-Dive Study Guide

**Context:** You build a system that extracts information from **unstructured documents**, validates output with **JSON schemas**, maintains high accuracy, handles edge cases gracefully, and feeds downstream systems.

**Primary domains:** Prompt Engineering & Structured Output (D4) · Context Management & Reliability (D5)

---

## Part 1: Structured Output via tool_use (Task Statement 4.3)

### Why tool_use is the answer
Defining an "extraction tool" whose **input schema is your target JSON schema** and reading the structured data out of the `tool_use` block is **the most reliable way to get guaranteed schema-compliant output**. It **eliminates JSON syntax errors** (no unbalanced braces, no markdown fences, no trailing commas).

```python
tools = [{
  "name": "record_invoice",
  "description": "Record extracted invoice data",
  "input_schema": {
    "type": "object",
    "properties": {
      "invoice_number": {"type": "string"},
      "total": {"type": "number"},
      "due_date": {"type": ["string", "null"]},          # nullable!
      "category": {"enum": ["utilities", "services", "goods", "unclear", "other"]},
      "category_detail": {"type": ["string", "null"]}     # pairs with "other"
    },
    "required": ["invoice_number", "total"]
  }
}]
resp = client.messages.create(..., tools=tools, tool_choice={"type": "any"})
data = next(b.input for b in resp.content if b.type == "tool_use")
```

### Critical limitation
Strict schemas eliminate **syntax** errors but **NOT semantic errors**: line items that don't sum to the stated total, values placed in the wrong fields, plausible-but-wrong extractions. Semantic quality still needs validation + prompting.

### tool_choice (memorize the three)
| Setting | Behavior | Use when |
|---|---|---|
| `"auto"` | May reply with plain text OR call a tool | Conversational agents |
| `"any"` | MUST call a tool, model picks which | Multiple extraction schemas, unknown document type — guarantees structured output |
| `{"type": "tool", "name": "extract_metadata"}` | MUST call that exact tool | Force a specific extraction first (e.g., metadata before enrichment), then handle subsequent steps in follow-up turns |

### Schema design to prevent hallucination
- **Optional/nullable fields** for information that **may not exist in the source**. If a field is `required` but absent from the document, the model tends to **fabricate a value to satisfy the schema**. Nullable → it returns null instead.
- **Enums** with escape hatches: add **`"unclear"`** for ambiguous cases and **`"other"` + a detail string field** for extensible categories.
- Include **format normalization rules in the prompt** alongside the strict schema (e.g., "convert all dates to ISO 8601; strip currency symbols") to tame inconsistent source formatting.

---

## Part 2: Validation, Retry, Feedback Loops (Task Statement 4.4)

### Retry-with-error-feedback
On validation failure (Pydantic / JSON Schema), send a follow-up including:
1. The **original document**
2. The **failed extraction**
3. The **specific validation errors**

The model self-corrects against explicit feedback.

### When retries work vs don't (heavily tested)
| Failure cause | Retry helps? |
|---|---|
| Format mismatch (date format, number as string) | ✅ Yes |
| Structural output error (wrong nesting, missing wrapper) | ✅ Yes |
| **Information absent from the source document** (e.g., exists only in an external doc not provided) | ❌ **No — retries cannot conjure missing data.** Route to null/human review instead |

### Self-correction validation flows
- Extract **`calculated_total`** (sum of line items) alongside **`stated_total`** — a mismatch flags a discrepancy for review.
- Add **`conflict_detected`** booleans when source data is internally inconsistent.
- Add **`detected_pattern`** fields so dismissed/erroneous findings can be analyzed systematically.

### Few-shot for structural variety (Task Statement 4.2 applied)
When documents vary structurally (inline citations vs bibliographies; methodology sections vs embedded details; narrative vs tables; informal measurements), add **few-shot examples demonstrating correct extraction from each variant**. This is also the fix for **empty/null extractions of fields that ARE present** but formatted unusually — and it reduces hallucination on informal formats.

---

## Part 3: Batch Processing Strategy (Task Statement 4.5)

Facts: **50% cost savings · up to 24h processing · no latency SLA · `custom_id` correlation · no multi-turn tool calling inside a batch request.**

Pipeline design:
1. **Refine the prompt on a sample set first** — maximizes first-pass success, minimizes costly resubmission cycles.
2. Submit the corpus with unique `custom_id`s.
3. Poll for completion; join results to inputs by `custom_id`.
4. **Resubmit only failures**, modified appropriately — e.g., **chunk documents that exceeded context limits**.
5. **SLA math:** guarantee turnaround of T hours with a 24h max processing window → submission interval ≤ T − 24 (guide example: 30-hour SLA → 4-hour submission windows).

Appropriateness: overnight reports, weekly audits, large back-fills = batch. Anything a user or pipeline blocks on = synchronous.

---

## Part 4: Human Review Workflows & Confidence Calibration (Task Statement 5.5)

### The aggregate-metrics trap
**97% overall accuracy can mask terrible performance on specific document types or fields** (e.g., 99% on invoices, 70% on handwritten receipts). Before reducing human review, **validate accuracy segmented by document type AND by field**.

### Calibrated confidence routing
1. Have the model output **field-level confidence scores**.
2. **Calibrate thresholds using a labeled validation set** — raw LLM confidence is not trustworthy until mapped against ground truth.
3. Route to human review: **low-confidence extractions** and **ambiguous/contradictory source documents** — prioritizing limited reviewer capacity where it matters.

### Ongoing monitoring
**Stratified random sampling of high-confidence extractions** for continuous error-rate measurement and **novel error pattern detection**. High-confidence ≠ never wrong; without sampling, new failure modes go unnoticed.

---

## Part 5: Context & Reliability for Extraction (Domain 5 touches)

- **Long documents:** lost-in-the-middle applies — fields buried mid-document are at higher risk; consider chunking or restructuring inputs.
- **Temporal fields:** capture publication/collection dates so downstream systems don't misread time differences as contradictions.
- **Conflicting values within a document:** extract both with annotation (`conflict_detected`) rather than silently choosing.

---

## Part 6: Practice Questions

**Q1.** Your extraction pipeline intermittently fails on malformed JSON: markdown fences, trailing commas, unescaped quotes. Most reliable fix?

A. Post-process the text with regex cleanup before parsing
B. Prompt: "Respond ONLY with valid JSON, no markdown"
C. Define an extraction tool with your JSON schema as input_schema and read the tool_use block, with tool_choice forcing tool use
D. Retry parsing up to five times

**Answer: C.** tool_use with schemas eliminates syntax errors entirely — the model fills schema-validated parameters instead of free-writing JSON. A, B, D reduce but don't eliminate failures.

---

**Q2.** Invoices sometimes lack a PO number, but your schema marks `po_number` as required. The model fills in realistic-looking fake PO numbers. Fix?

A. Prompt: "never make up PO numbers"
B. Make `po_number` nullable/optional so the model can return null when absent
C. Validate PO numbers against the ERP after extraction
D. Lower temperature to 0

**Answer: B.** Required fields pressure the model to fabricate. Nullable schema design removes the pressure at the root. A is probabilistic; C catches but doesn't prevent; D doesn't change the schema constraint.

---

**Q3.** A batch of 5,000 contracts returns 200 validation failures: 150 are "date format invalid," 50 are "counterparty_address missing" where the address exists only in a separate exhibit document not included. Handling?

A. Retry all 200 with error feedback
B. Retry the 150 format failures with specific validation errors included; route the 50 missing-source cases to null/human handling — retries cannot recover absent information
C. Retry all 200 with a stronger prompt
D. Mark all 200 as unextractable

**Answer: B.** Retry-with-error-feedback fixes format/structural errors; it is ineffective when the information isn't in the provided source. Segment failures by cause.

---

**Q4.** You have three extraction tools (invoice, receipt, contract) and don't know each document's type in advance. You need guaranteed structured output. tool_choice?

A. `"auto"`
B. `"any"`
C. `{"type": "tool", "name": "extract_invoice"}`
D. Omit tool_choice

**Answer: B.** `"any"` guarantees a tool call (structured output) while letting the model pick the schema matching the document type. `"auto"` (A/D) may return prose; forcing one tool (C) is wrong for unknown types.

---

**Q5.** Your dashboard shows 97% accuracy, so leadership wants human review dropped for all "high-confidence" extractions. What must you verify first, and how do you keep it safe over time?

A. Nothing — 97% exceeds the target
B. Segment accuracy by document type and field to expose weak segments; then keep stratified random sampling of high-confidence extractions to measure error rates and catch novel patterns
C. Raise the confidence threshold to 99%
D. Ask the model whether it feels confident enough

**Answer: B.** Aggregate metrics mask segment-level failures; stratified sampling of the automated stream is the ongoing safety net. Raw model confidence (C/D) is uncalibrated until validated against labeled data.

---

**Q6.** Extracted invoices pass schema validation, but the line items often don't sum to the stated total. What design catches this?

A. Stricter JSON schema types
B. Extract `calculated_total` alongside `stated_total` and flag discrepancies (semantic validation), optionally with a `conflict_detected` boolean
C. Increase max_tokens
D. Switch to XML output

**Answer: B.** This is a *semantic* error; schema strictness (A) only governs syntax/structure. Cross-field validation with self-reported computed values flags inconsistency for review.

---

**Q7.** Extraction accuracy is fine on formal reports but the model returns null for measurements written informally ("about two and a half meters") even though they're present. Fix?

A. Mark measurement fields required to force extraction
B. Add few-shot examples demonstrating correct extraction of informal/varied formats, plus normalization rules in the prompt
C. Preprocess documents with regex to standardize measurements
D. Retry nulls automatically

**Answer: B.** Few-shot examples on varied/informal structures are the documented fix for wrongly-null fields and hallucination on informal formats; normalization rules pair with the strict schema. A causes fabrication elsewhere; C is brittle; D retries without new guidance rarely helps.

---

## Key Takeaways Card
- tool_use + input_schema = guaranteed syntax; semantics still need validation (calculated vs stated totals, conflict_detected).
- tool_choice: auto = may talk; any = must call some tool; forced = must call THAT tool (then continue in follow-up turns).
- Nullable fields prevent fabrication; enums get "unclear" and "other"+detail.
- Retry with (document + failed output + specific errors); never retry absent-information failures.
- Few-shot for structural variety and informal formats; normalization rules alongside strict schemas.
- Batch: sample-refine first, custom_id everything, resubmit only failures (chunk oversized docs), interval ≤ SLA − 24h.
- Segment accuracy by doc type & field; calibrate confidence on labeled sets; stratified-sample the high-confidence stream forever.

**Docs:** Tool use — https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview · Batches — https://docs.claude.com/en/api (Message Batches)
