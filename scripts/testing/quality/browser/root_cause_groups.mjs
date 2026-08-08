import { createHash } from "node:crypto";

const GROUP_RULES = [
  {
    id: "bs-root-mobile-navigation",
    pattern: /mobile navigation/i,
    component: "global mobile navigation",
    source: ["site/assets/bs-site-tools.js", "site/assets/bs.css"],
    task: "Investigate mobile-navigation initialization and keyboard behavior."
  },
  {
    id: "bs-root-continuous-duplicate-ids",
    pattern: /duplicate IDs|IDs are unique/i,
    component: "continuous Learn/Research content",
    source: ["site/assets/bs-learn-scroll.js", "site/assets/bs-research-scroll.js"],
    task: "Correct duplicate IDs without excluding or suppressing appended content."
  },
  {
    id: "bs-root-glossary-sidebar",
    pattern: /glossary.*sidebar|inline glossary/i,
    component: "glossary definition sidebar",
    source: ["site/assets/bs-glossary.js", "site/assets/bs-site-tools.js"],
    task: "Restore the glossary sidebar flow and its focus lifecycle."
  },
  {
    id: "bs-root-term-lookup",
    pattern: /term lookup/i,
    component: "term lookup",
    source: ["site/assets/bs-site-tools.js"],
    task: "Make desktop and mobile term lookup availability consistent."
  },
  {
    id: "bs-root-fixed-sticky-overlap",
    pattern: /fixed or sticky|cover controls or headings/i,
    component: "fixed and sticky layout",
    source: ["site/assets/bs.css"],
    task: "Resolve fixed or sticky overlap at the affected breakpoints."
  },
  {
    id: "bs-root-heading-hierarchy",
    pattern: /heading levels|visible H1/i,
    component: "document heading hierarchy",
    source: ["site/**/*.qmd", "site/_quarto.yml"],
    task: "Correct heading hierarchy in the affected rendered routes."
  },
  {
    id: "bs-root-updates-initialization",
    pattern: /updates.*(?:TypeError|ReferenceError|Uncaught)|(?:TypeError|ReferenceError|Uncaught).*updates/i,
    component: "Updates initialization",
    source: ["site/assets/bs-updates.js"],
    task: "Investigate the Updates initialization error."
  },
  {
    id: "bs-root-back-to-top",
    pattern: /back-to-top/i,
    component: "back-to-top interaction",
    source: ["site/assets/bs-site-tools.js"],
    task: "Correct back-to-top activation and final scroll position."
  },
  {
    id: "bs-root-clipped-controls",
    pattern: /horizontally clipped/i,
    component: "responsive control layout",
    source: ["site/assets/bs.css"],
    task: "Correct clipped controls at the affected viewport widths."
  },
  {
    id: "bs-root-glossary-filtering",
    pattern: /glossary.*(?:filter|search)|(?:filter|search).*glossary/i,
    component: "glossary filtering",
    source: ["site/assets/bs-glossary.js"],
    task: "Align glossary filtering results with the documented interaction contract."
  },
  {
    id: "bs-root-keyboard-focus",
    pattern: /keyboard|focus|skip link/i,
    component: "keyboard focus",
    source: ["site/assets/bs.css", "site/assets/bs-site-tools.js"],
    task: "Investigate focus order, indicators, traps, and interaction return focus."
  }
];

const fallbackRule = (finding) => {
  const label = `${finding.component}|${finding.category}|${finding.evidence
    .replace(/; screenshot: .+$/i, "")
    .replace(/: .+$/, "")}`;
  return {
    id: `bs-root-${createHash("sha256").update(label).digest("hex").slice(0, 12)}`,
    component: finding.component || "browser baseline",
    source: [],
    task: "Review this evidence group and create a scoped product or infrastructure task.",
    confidence: "medium"
  };
};

export const rootCauseRuleForFinding = (finding) =>
  GROUP_RULES.find((rule) => rule.pattern.test(finding.evidence)) ||
  fallbackRule(finding);

const highestSeverity = (values) => {
  const order = ["minor", "major", "blocking"];
  return values.reduce(
    (highest, value) =>
      order.indexOf(value) > order.indexOf(highest) ? value : highest,
    "minor"
  );
};

const groupStability = (findings) => {
  for (const classification of [
    "test-infrastructure",
    "environment-dependent",
    "volatile",
    "stable"
  ]) {
    if (findings.some((finding) => finding.stability === classification)) {
      return classification;
    }
  }
  return "test-infrastructure";
};

export const groupFindingsByRootCause = (findings) => {
  const grouped = new Map();
  for (const finding of findings) {
    const rule = rootCauseRuleForFinding(finding);
    const instances = grouped.get(rule.id) || { rule, findings: [] };
    instances.findings.push(finding);
    grouped.set(rule.id, instances);
  }
  return Array.from(grouped.values(), ({ rule, findings: instances }) => ({
    root_cause_id: rule.id,
    category: Array.from(new Set(instances.map((item) => item.category))).sort().join(","),
    severity: highestSeverity(instances.map((item) => item.severity)),
    affected_component: rule.component,
    affected_routes: Array.from(
      new Set(instances.map((item) => item.route_or_file))
    ).sort(),
    affected_viewports: Array.from(
      new Set(instances.map((item) => item.viewport?.name).filter(Boolean))
    ).sort(),
    finding_instances: instances.length,
    representative_selectors: Array.from(
      new Set(instances.map((item) => item.selector).filter(Boolean))
    )
      .sort()
      .slice(0, 10),
    representative_screenshots: Array.from(
      new Set(
        instances.flatMap((item) => {
          const match = item.evidence.match(/; screenshot: (.+)$/i);
          return match ? [match[1]] : [];
        })
      )
    )
      .sort()
      .slice(0, 5),
    likely_source_files: rule.source,
    stability: groupStability(instances),
    confidence: rule.confidence || "high",
    reproduction: Array.from(new Set(instances.map((item) => item.reproduction))).sort(),
    recommended_future_task: rule.task,
    finding_ids: instances.map((item) => item.finding_id).sort()
  })).sort((left, right) =>
    left.root_cause_id.localeCompare(right.root_cause_id)
  );
};
