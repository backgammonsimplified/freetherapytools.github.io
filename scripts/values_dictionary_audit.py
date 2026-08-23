#!/usr/bin/env python3
"""Audit the authored Values dictionary and write review artifacts."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from values_workbook import DEFAULT_SOURCE, EXCLUDED_VALUE_NAMES, extract_values, paragraphs


ROOT = Path(__file__).resolve().parents[1]
CSV_OUTPUT = ROOT / "data" / "values-dictionary-review.csv"
MARKDOWN_OUTPUT = ROOT / "VALUES-DICTIONARY-REVIEW.md"

MERGES = {
    "bravery": "courage",
    "valor": "courage",
    "dependability": "reliability",
    "flexibility": "adaptability",
    "candor": "honesty",
    "giving": "generosity",
    "thankfulness": "gratitude",
    "teamwork": "collaboration",
}

DOMAIN_MOVES = {
    "health": "Health, Self-Care & Vitality",
    "family": "Close Relationships, Family & Caregiving",
    "friendship": "Friendship & Social Connection",
    "community": "Community, Service & Environment",
    "spirituality": "Spirituality, Meaning & Inner Life",
}

OUTCOME_REVIEW = {
    "abundance", "attractiveness", "belonging", "certainty", "comfort", "confidence",
    "contentment", "energy", "fame", "fitness", "happiness", "popularity", "power",
    "prosperity", "recognition", "safety", "security", "stability", "status", "success",
    "talent", "vitality", "wealth", "well-being", "winning",
}

GOAL_REVIEW = {
    "accomplishment", "advancement", "being-the-best", "greatness", "performance",
    "results-orientation",
}

STANDARD_REVIEW = {"cleanliness", "conformity", "control", "order", "quality", "structure"}

PROCESS_REVIEW = {"hard-work", "industry", "productivity", "recreation", "self-care"}

CLUSTERS = {
    "courage": "courage-bravery-boldness-fortitude",
    "bravery": "courage-bravery-boldness-fortitude",
    "boldness": "courage-bravery-boldness-fortitude",
    "fortitude": "courage-bravery-boldness-fortitude",
    "valor": "courage-bravery-boldness-fortitude",
    "reliability": "reliability-dependability-consistency",
    "dependability": "reliability-dependability-consistency",
    "consistency": "reliability-dependability-consistency",
    "adaptability": "adaptability-flexibility",
    "flexibility": "adaptability-flexibility",
    "honesty": "honesty-candor-integrity-ethics",
    "candor": "honesty-candor-integrity-ethics",
    "integrity": "honesty-candor-integrity-ethics",
    "ethics": "honesty-candor-integrity-ethics",
    "openness": "openness-open-mindedness",
    "open-mindedness": "openness-open-mindedness",
    "generosity": "generosity-giving-charity-benevolence",
    "giving": "generosity-giving-charity-benevolence",
    "charity": "generosity-giving-charity-benevolence",
    "benevolence": "generosity-giving-charity-benevolence",
    "commitment": "commitment-dedication-persistence-determination",
    "dedication": "commitment-dedication-persistence-determination",
    "persistence": "commitment-dedication-persistence-determination",
    "determination": "commitment-dedication-persistence-determination",
    "kindness": "kindness-care-compassion-empathy-friendliness-benevolence",
    "care": "kindness-care-compassion-empathy-friendliness-benevolence",
    "compassion": "kindness-care-compassion-empathy-friendliness-benevolence",
    "empathy": "kindness-care-compassion-empathy-friendliness-benevolence",
    "friendliness": "kindness-care-compassion-empathy-friendliness-benevolence",
    "responsibility": "responsibility-accountability",
    "accountability": "responsibility-accountability",
    "fairness": "fairness-equality-justice",
    "equality": "fairness-equality-justice",
    "justice": "fairness-equality-justice",
    "autonomy": "autonomy-independence-freedom-individuality",
    "independence": "autonomy-independence-freedom-individuality",
    "freedom": "autonomy-independence-freedom-individuality",
    "individuality": "autonomy-independence-freedom-individuality",
    "mindfulness": "mindfulness-presence-awareness-attentiveness-self-awareness-reflectiveness",
    "presence": "mindfulness-presence-awareness-attentiveness-self-awareness-reflectiveness",
    "awareness": "mindfulness-presence-awareness-attentiveness-self-awareness-reflectiveness",
    "attentiveness": "mindfulness-presence-awareness-attentiveness-self-awareness-reflectiveness",
    "self-awareness": "mindfulness-presence-awareness-attentiveness-self-awareness-reflectiveness",
    "reflectiveness": "mindfulness-presence-awareness-attentiveness-self-awareness-reflectiveness",
    "joy": "joy-enjoyment-fun-playfulness-cheerfulness-recreation",
    "enjoyment": "joy-enjoyment-fun-playfulness-cheerfulness-recreation",
    "fun": "joy-enjoyment-fun-playfulness-cheerfulness-recreation",
    "playfulness": "joy-enjoyment-fun-playfulness-cheerfulness-recreation",
    "cheerfulness": "joy-enjoyment-fun-playfulness-cheerfulness-recreation",
    "recreation": "joy-enjoyment-fun-playfulness-cheerfulness-recreation",
    "learning": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "knowledge": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "curiosity": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "exploration": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "insight": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "wisdom": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "growth": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "improvement": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "mastery": "learning-knowledge-curiosity-exploration-insight-wisdom-growth-improvement-mastery",
    "achievement": "achievement-excellence-competence-mastery-effectiveness",
    "excellence": "achievement-excellence-competence-mastery-effectiveness",
    "competence": "achievement-excellence-competence-mastery-effectiveness",
    "effectiveness": "achievement-excellence-competence-mastery-effectiveness",
    "calmness": "calmness-peace-harmony-balance-stability-moderation",
    "peace": "calmness-peace-harmony-balance-stability-moderation",
    "harmony": "calmness-peace-harmony-balance-stability-moderation",
    "balance": "calmness-peace-harmony-balance-stability-moderation",
    "moderation": "calmness-peace-harmony-balance-stability-moderation",
    "contribution": "community-contribution-service-giving-charity-advocacy",
    "service": "community-contribution-service-giving-charity-advocacy",
    "advocacy": "community-contribution-service-giving-charity-advocacy",
    "fitness": "health-fitness-self-care-energy",
    "self-care": "health-fitness-self-care-energy",
    "energy": "health-fitness-self-care-energy",
    "intimacy": "family-friendship-intimacy-connection",
    "connection": "family-friendship-intimacy-connection",
}

INTENTIONAL_DISTINCTIONS = [
    ("Boldness / Fortitude", "Boldness emphasizes willingness to be conspicuous or direct; Fortitude emphasizes steadiness through hardship."),
    ("Consistency / Reliability", "Consistency is regularity of practice; Reliability is being countable on for commitments."),
    ("Integrity / Ethics / Honesty", "Integrity concerns congruence, Ethics considered conduct, and Honesty truthfulness."),
    ("Openness / Open-Mindedness", "Openness includes receptivity to experience and feedback; Open-Mindedness is specifically considering evidence and viewpoints."),
    ("Compassion / Empathy / Kindness", "Understanding another's experience, responding to suffering, and everyday benevolent conduct are related but usable distinctions."),
    ("Responsibility / Accountability", "Responsibility concerns duties; Accountability adds ownership of impact, repair, and answerability."),
    ("Fairness / Equality / Justice", "Impartial decisions, equal worth/opportunity, and changing unjust systems are not interchangeable."),
    ("Autonomy / Independence / Freedom / Individuality", "Self-direction, self-reliance, available choice, and distinct identity guide different decisions."),
    ("Mindfulness / Presence / Awareness / Self-Awareness / Reflectiveness", "These differ in stance, attentional target, and whether the practice is immediate or retrospective."),
    ("Joy / Enjoyment / Fun / Playfulness", "Emotional quality, appreciating experience, activity, and playful stance remain meaningfully different."),
    ("Curiosity / Learning / Knowledge / Wisdom / Mastery", "Inquiry, process, accumulated understanding, judgment, and refined skill are separate directions."),
    ("Achievement / Excellence / Competence / Effectiveness", "Results, quality, capability, and choosing what works should not be collapsed."),
    ("Calmness / Peace / Harmony / Balance / Moderation", "Inner tone, nonviolence, relationship among parts, allocation, and avoiding extremes are distinct."),
    ("Connection / Intimacy", "Broad social connection does not necessarily imply close vulnerability or intimacy."),
]


def classify(value_id: str) -> tuple[str, str, str, str]:
    if value_id in MERGES:
        return "duplicate-near-duplicate", "MERGE_ALIAS", MERGES[value_id], "Most users would treat this label as the same practical compass direction in this tool."
    if value_id in DOMAIN_MOVES:
        return "life-domain", "MOVE_TO_DOMAIN", "", f"Duplicates the existing {DOMAIN_MOVES[value_id]} life-domain taxonomy."
    if value_id == "perfection":
        return "preference-standard", "REMOVE", "", "An evaluative endpoint or flawlessness standard, not an ongoing chosen direction."
    if value_id in OUTCOME_REVIEW:
        return "need-condition-outcome", "REVIEW", "", "May be a desired condition or outcome; retain canonically until editorial review."
    if value_id in GOAL_REVIEW:
        return "goal-achievement", "REVIEW", "", "May describe an endpoint or achievement more than an ongoing direction; retain for review."
    if value_id in STANDARD_REVIEW:
        return "preference-standard", "REVIEW", "", "May function as a preference or standard; retain for review rather than remove automatically."
    if value_id in PROCESS_REVIEW:
        return "behavior-process", "REVIEW", "", "A process label that may still work as a chosen direction; retain for review."
    return "chosen-value", "KEEP", value_id, "Supports an ongoing direction or quality of living."


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--csv", type=Path, default=CSV_OUTPUT)
    parser.add_argument("--markdown", type=Path, default=MARKDOWN_OUTPUT)
    args = parser.parse_args()
    values = [value for value in extract_values(paragraphs(args.source)) if value["name"] not in EXCLUDED_VALUE_NAMES]
    from values_workbook import add_display_ranks
    add_display_ranks(values)
    rows = []
    aliases_by_canonical: dict[str, list[str]] = {}
    names = {str(value["id"]): str(value["name"]) for value in values}
    for value in sorted(values, key=lambda item: int(item["display_rank"])):
        value_id = str(value["id"])
        classification, decision, canonical, reason = classify(value_id)
        if decision == "MERGE_ALIAS":
            aliases_by_canonical.setdefault(canonical, []).append(str(value["name"]))
        rows.append({
            "current_id": value_id,
            "current_label": value["name"],
            "current_rank": value["display_rank"],
            "classification": classification,
            "synonym_cluster": CLUSTERS.get(value_id, ""),
            "proposed_canonical": names.get(canonical, canonical),
            "decision": decision,
            "aliases": str(value["name"]) if decision == "MERGE_ALIAS" else "",
            "reason": reason,
        })
    args.csv.parent.mkdir(parents=True, exist_ok=True)
    with args.csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    review_count = sum(row["decision"] == "REVIEW" for row in rows)
    lines = [
        "# Values Dictionary Semantic Review", "",
        "This audit treats values as ongoing compass directions, not destinations. It reviews all 256 authored canonical entries; it does not mechanically convert labels into verbs.", "",
        "## Implemented high-confidence cleanup", "",
        f"- Starting canonical count: {len(rows)}",
        f"- Resulting canonical count: {len(rows) - len(MERGES) - len(DOMAIN_MOVES) - 1}",
        "- Removed standard: Perfection",
        f"- Review-needed entries retained: {review_count}", "",
        "### Merges", "",
    ]
    for canonical, aliases in sorted(aliases_by_canonical.items()):
        lines.append(f"- {names[canonical]} <- {', '.join(aliases)}")
    lines += ["", "### Moved to the existing life-domain model", ""]
    for value_id, domain in DOMAIN_MOVES.items():
        lines.append(f"- {names[value_id]} -> {domain}")
    lines += ["", "## Important distinctions intentionally preserved", ""]
    for terms, reason in INTENTIONAL_DISTINCTIONS:
        lines.append(f"- **{terms}:** {reason}")
    lines += ["", "## Complete row-level review", "", "The machine-readable audit is [`data/values-dictionary-review.csv`](data/values-dictionary-review.csv). Every original ID, label, rank, classification, cluster, proposed canonical label, decision, alias, and reason is recorded there.", ""]
    args.markdown.write_text("\n".join(lines), encoding="utf-8")
    print(f"Audited {len(rows)} Values; {review_count} retained for review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
