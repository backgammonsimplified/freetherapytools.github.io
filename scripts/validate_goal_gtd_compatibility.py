#!/usr/bin/env python3
"""Validate representative SMART Goal Markdown with Personal Planning runtime."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def generated_markdown() -> str:
    script = r"""
const goal = require('./site/assets/skill-practice-apps.js');
const progress = require('./site/assets/skill-progress.js');
const state = {
  fields: {
    direction: 'Connection and Courage in Close Relationships',
    specific: 'Send Sam a message and ask if he wants to meet for coffee',
    measurable: 'The message is sent', achievable: 'I have his contact details',
    relevant: 'This supports Connection and Courage in Close Relationships.',
    time: 'This week', smallest: 'Draft the message', support: 'A reminder after dinner'
  },
  summaryBuilt: true,
  context: {
    domain: 'Close Relationships, Family & Caregiving', values: ['Connection', 'Courage'],
    what: 'Reconnect with an old relationship.', how: 'Send Sam a message and ask if he wants to meet for coffee',
    mission: 'Keep making room for meaningful conversations.'
  },
  targetDate: '2026-09-15',
  calendar: { enabled: true, date: '2026-08-25', startTime: '19:00', durationMinutes: '30' },
  gtd: { taskId: 'smart_goal_runtime_test', captureSequence: 1787500000000001, createdAt: '2026-08-23T12:00:00.000Z' }
};
const record = progress.makeRecord({toolId:'goal-builder',toolTitle:'SMART Goal Builder',route:'/skill-finder/goal-builder/',schemaVersion:1}, state, new Date('2026-08-23T12:30:00Z'));
process.stdout.write(goal.goalGtdMarkdown(record, state));
"""
    return subprocess.run(["node", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, required=True)
    args = parser.parse_args()
    source = args.reference.resolve()
    if not (source / "src/life_gtd/markdown_store.py").is_file():
        raise SystemExit("Personal Planning runtime source not found")
    sys.path.insert(0, str(source / "src"))
    from life_gtd.markdown_store import MarkdownTaskRepository  # type: ignore[import-not-found]
    from life_gtd.models import DataDocument, empty_document  # type: ignore[import-not-found]

    print("Running Personal Planning parser and validator...", flush=True)
    task = ROOT / "tests" / ".sandbox" / "runtime-only" / "tasks" / "smart_goal_runtime_test.md"
    parsed = MarkdownTaskRepository(task.parents[1])._parse_record_text(generated_markdown(), task)
    base = empty_document().model_dump(mode="json")
    base["tasks"] = [parsed.task.model_dump(mode="json")]
    document = DataDocument.model_validate(base)
    matched = next(item for item in document.tasks if item.id == "smart_goal_runtime_test")
    assert matched.title == "Send Sam a message and ask if he wants to meet for coffee"
    assert matched.due_date.isoformat() == "2026-09-15"
    assert matched.scheduled_date is None
    assert "therapy-skill-kit-progress" in matched.notes
    print(json.dumps({"validated": True, "task_id": matched.id, "parser": "MarkdownTaskRepository", "validator": "DataDocument"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
