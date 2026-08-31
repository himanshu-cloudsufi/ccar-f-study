import overview from "../content/00-CCAR-F-Overview-and-Study-Plan.md?raw"
import s1 from "../content/01-Customer-Support-Resolution-Agent.md?raw"
import s2 from "../content/02-Code-Generation-with-Claude-Code.md?raw"
import s3 from "../content/03-Multi-Agent-Research-System.md?raw"
import s4 from "../content/04-Developer-Productivity-with-Claude.md?raw"
import s5 from "../content/05-Claude-Code-for-CI-CD.md?raw"
import s6 from "../content/06-Structured-Data-Extraction.md?raw"
import examGuide from "../content/07-Official-Exam-Guide.md?raw"

export interface Guide {
  id: string
  shortTitle: string
  title: string
  tag: string
  content: string
}

export const guides: Guide[] = [
  {
    id: "overview",
    shortTitle: "Overview & Study Plan",
    title: "Master Overview & Study Plan",
    tag: "Start here",
    content: overview,
  },
  {
    id: "exam-guide",
    shortTitle: "Official Exam Guide",
    title: "Official Exam Guide (v0.2)",
    tag: "Authoritative",
    content: examGuide,
  },
  {
    id: "s1",
    shortTitle: "1 · Customer Support Agent",
    title: "Scenario 1: Customer Support Resolution Agent",
    tag: "D1 · D2 · D5",
    content: s1,
  },
  {
    id: "s2",
    shortTitle: "2 · Code Gen with Claude Code",
    title: "Scenario 2: Code Generation with Claude Code",
    tag: "D3 · D5",
    content: s2,
  },
  {
    id: "s3",
    shortTitle: "3 · Multi-Agent Research",
    title: "Scenario 3: Multi-Agent Research System",
    tag: "D1 · D2 · D5",
    content: s3,
  },
  {
    id: "s4",
    shortTitle: "4 · Developer Productivity",
    title: "Scenario 4: Developer Productivity with Claude",
    tag: "D2 · D3 · D1",
    content: s4,
  },
  {
    id: "s5",
    shortTitle: "5 · Claude Code for CI/CD",
    title: "Scenario 5: Claude Code for Continuous Integration",
    tag: "D3 · D4",
    content: s5,
  },
  {
    id: "s6",
    shortTitle: "6 · Structured Data Extraction",
    title: "Scenario 6: Structured Data Extraction",
    tag: "D4 · D5",
    content: s6,
  },
]
