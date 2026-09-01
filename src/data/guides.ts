import type { GuideDoc } from "@/lib/blocks";
import overview from "../content/blocks/00-CCAR-F-Overview-and-Study-Plan.json";
import s1 from "../content/blocks/01-Customer-Support-Resolution-Agent.json";
import s2 from "../content/blocks/02-Code-Generation-with-Claude-Code.json";
import s3 from "../content/blocks/03-Multi-Agent-Research-System.json";
import s4 from "../content/blocks/04-Developer-Productivity-with-Claude.json";
import s5 from "../content/blocks/05-Claude-Code-for-CI-CD.json";
import s6 from "../content/blocks/06-Structured-Data-Extraction.json";
import examGuide from "../content/blocks/07-Official-Exam-Guide.json";

export interface Guide {
  id: string;
  shortTitle: string;
  title: string;
  tag: string;
  doc: GuideDoc;
}

// The block documents are generated from src/content/*.md and checked against it
// by scripts/validate-guide-json.py. Edit the Markdown, then regenerate.
const doc = (raw: unknown) => raw as GuideDoc;

export const guides: Guide[] = [
  {
    id: "overview",
    shortTitle: "Overview & Study Plan",
    title: "Master Overview & Study Plan",
    tag: "Start here",
    doc: doc(overview),
  },
  {
    id: "exam-guide",
    shortTitle: "Official Exam Guide",
    title: "Official Exam Guide (v0.2)",
    tag: "Authoritative",
    doc: doc(examGuide),
  },
  {
    id: "s1",
    shortTitle: "1 · Customer Support Agent",
    title: "Scenario 1: Customer Support Resolution Agent",
    tag: "D1 · D2 · D5",
    doc: doc(s1),
  },
  {
    id: "s2",
    shortTitle: "2 · Code Gen with Claude Code",
    title: "Scenario 2: Code Generation with Claude Code",
    tag: "D3 · D5",
    doc: doc(s2),
  },
  {
    id: "s3",
    shortTitle: "3 · Multi-Agent Research",
    title: "Scenario 3: Multi-Agent Research System",
    tag: "D1 · D2 · D5",
    doc: doc(s3),
  },
  {
    id: "s4",
    shortTitle: "4 · Developer Productivity",
    title: "Scenario 4: Developer Productivity with Claude",
    tag: "D2 · D3 · D1",
    doc: doc(s4),
  },
  {
    id: "s5",
    shortTitle: "5 · Claude Code for CI/CD",
    title: "Scenario 5: Claude Code for Continuous Integration",
    tag: "D3 · D4",
    doc: doc(s5),
  },
  {
    id: "s6",
    shortTitle: "6 · Structured Data Extraction",
    title: "Scenario 6: Structured Data Extraction",
    tag: "D4 · D5",
    doc: doc(s6),
  },
];
