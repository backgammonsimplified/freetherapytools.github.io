"""Build source-supported data used by the interactive Skill Finder tools.

The reference book is used only as a text index for material already selected by
the section-scan curriculum. This script extracts the three-page Pleasant Events
List and writes the curated emotion fields transcribed from Emotion Regulation
Handouts 6 and 11.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path


EMOTIONS = [
    {
        "id": "anger", "name": "Anger",
        "related_words": ["aggravation", "agitation", "annoyance", "bitterness", "exasperation", "ferocity", "frustration", "fury", "grouchiness", "grumpiness", "hostility", "indignation", "irritation", "outrage", "rage", "vengefulness", "wrath"],
        "body_changes": ["muscles tightening", "teeth clamping", "hands clenching", "face feeling flushed or hot", "feeling like you may explode"],
        "action_urges": ["attack", "criticize", "withdraw", "slam or throw things"],
        "opposite_actions": ["gently avoid instead of attacking", "take a time out and breathe slowly", "act kindly instead of being mean", "unclench hands, jaw, chest, and stomach"],
    },
    {
        "id": "disgust", "name": "Disgust",
        "related_words": ["abhorrence", "antipathy", "aversion", "condescension", "contempt", "derision", "disdain", "dislike", "distaste", "hate", "loathing", "repelled", "repugnance", "repulsion", "resentment", "revolted", "scorn", "sickened", "spite", "vile"],
        "body_changes": ["nausea or a sick feeling", "gagging or choking", "a lump in the throat", "urge to move away", "feeling contaminated or unclean"],
        "action_urges": ["avoid", "push away", "wash or clean", "reject or attack"],
        "opposite_actions": ["move closer when it is safe", "act kindly rather than with contempt", "take in sensory information", "relax the face, hands, chest, and stomach"],
    },
    {
        "id": "envy", "name": "Envy",
        "related_words": ["bitterness", "covetous", "craving", "discontented", "disgruntled", "displeased", "dissatisfied", "downhearted", "greed", "green-eyed", "longing", "pettiness", "resentment", "wishful"],
        "body_changes": ["muscles tightening", "jaw or mouth tightening", "face feeling flushed or hot", "rigidity in the body"],
        "action_urges": ["take what someone else has", "compete", "discount what you have", "undermine another person"],
        "opposite_actions": ["do not destroy what another person has", "count your blessings without discounting them", "check facts about the other person's situation", "relax the body"],
    },
    {
        "id": "fear", "name": "Fear",
        "related_words": ["anxiety", "apprehension", "dread", "edginess", "fright", "horror", "hysteria", "jumpiness", "nervousness", "overwhelmed", "panic", "shock", "tenseness", "terror", "uneasiness", "worry"],
        "body_changes": ["breathlessness", "fast heartbeat", "lump in the throat", "tense or cramping muscles", "butterflies in the stomach", "shaking or trembling"],
        "action_urges": ["run away", "avoid", "hide", "freeze"],
        "opposite_actions": ["approach what is safe instead of avoiding", "look around and take in information", "use a confident posture and voice", "use paced breathing"],
    },
    {
        "id": "happiness", "name": "Happiness",
        "related_words": ["bliss", "contentment", "eagerness", "ecstasy", "elation", "enjoyment", "enthusiasm", "excitement", "exhilaration", "gladness", "jolliness", "joviality", "joy", "optimism", "pride", "relief", "satisfaction", "triumph", "zest"],
        "body_changes": ["feeling excited", "feeling energetic or active", "wanting to laugh", "face feeling flushed", "feeling open or expansive", "feeling at peace"],
        "action_urges": ["smile", "share", "connect", "continue the activity"],
        "opposite_actions": [],
    },
    {
        "id": "jealousy", "name": "Jealousy",
        "related_words": ["cautious", "clinging", "clutching", "defensive", "fear of losing someone or something", "mistrustful", "possessive", "rivalrous", "self-protective", "suspicious", "wary", "watchful"],
        "body_changes": ["breathlessness", "fast heartbeat", "lump in the throat", "muscle tension", "feeling rejected", "feeling helpless"],
        "action_urges": ["control", "cling", "question", "spy or snoop"],
        "opposite_actions": ["let go of controlling others", "share people and things in your life", "stop spying or probing", "take in all available information"],
    },
    {
        "id": "love", "name": "Love",
        "related_words": ["adoration", "affection", "arousal", "attraction", "caring", "charmed", "compassion", "enchantment", "fondness", "infatuation", "kindness", "limerence", "longing", "lust", "passion", "sympathy", "tenderness", "warmth"],
        "body_changes": ["feeling excited and energetic", "fast heartbeat", "wanting closeness", "wanting the best for someone", "wanting to spend time together"],
        "action_urges": ["move closer", "touch or embrace", "share", "care for the person"],
        "opposite_actions": ["avoid contact when love is not effective", "distract from repeated thoughts", "review the costs when those thoughts arise", "adjust posture and distance"],
    },
    {
        "id": "sadness", "name": "Sadness",
        "related_words": ["alienation", "alone", "anguish", "crushed", "dejection", "depression", "despair", "disappointment", "disconnected", "dismay", "displeasure", "gloom", "glumness", "grief", "homesickness", "hurt", "insecurity", "melancholy", "misery", "neglect", "pity", "sorrow", "suffering"],
        "body_changes": ["low energy", "feeling lethargic or listless", "difficulty swallowing", "breathlessness", "feeling that nothing is pleasurable"],
        "action_urges": ["withdraw", "isolate", "stay inactive", "avoid"],
        "opposite_actions": ["get active and approach", "avoid avoiding", "build mastery", "increase pleasant events", "attend to the present moment"],
    },
    {
        "id": "shame", "name": "Shame",
        "related_words": ["contrition", "culpability", "discomposure", "embarrassment", "humiliation", "mortification", "self-conscious", "shyness"],
        "body_changes": ["pain in the stomach", "a sense of dread", "wanting to shrink or disappear", "wanting to hide the face or body"],
        "action_urges": ["hide", "avoid", "appease", "look down or withdraw"],
        "opposite_actions": ["when safe, share with people who will accept you", "do not over-apologize for a perceived transgression", "take in all the information", "lift your head and keep a steady voice"],
    },
    {
        "id": "guilt", "name": "Guilt",
        "related_words": ["apologetic", "culpability", "remorse", "regret", "sorry"],
        "body_changes": ["hot or red face", "jitteriness or nervousness", "feeling unable to breathe freely"],
        "action_urges": ["repair harm", "apologize", "confess", "make amends"],
        "opposite_actions": ["when guilt does not fit, stop unnecessary apologies or repair attempts", "take in all the information", "use an upright posture and steady voice"],
    },
]


for emotion in EMOTIONS:
    emotion["source_reference"] = "Emotion Regulation Handout 6; Emotion Regulation Handout 11 where available"


def clean_text(value: str) -> str:
    value = value.replace("\u00ad", "").replace("\u2011", "-")
    return re.sub(r"\s+", " ", value).strip()


def extract_pleasant_events(book_pdf: Path, output_dir: Path) -> list[dict[str, object]]:
    text_path = output_dir / ".pleasant-events-source.txt"
    try:
        subprocess.run(
            ["pdftotext", "-f", "273", "-l", "275", "-raw", "-enc", "UTF-8", "--", str(book_pdf), str(text_path)],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if not text_path.exists():
            raise RuntimeError("pdftotext did not produce the Pleasant Events source text")
        text = text_path.read_text(encoding="utf-8")
    finally:
        text_path.unlink(missing_ok=True)

    values: dict[int, list[str]] = {}
    current: int | None = None
    ignored_prefixes = ("Emotion Regulation Handout", "From DBT", "(continued", "Note.")
    for raw_line in text.splitlines():
        line = raw_line.strip()
        match = re.match(r"^(\d{1,3})\.\s*", line)
        if match and 1 <= int(match.group(1)) <= 225:
            current = int(match.group(1))
            values[current] = []
            continue
        if current and line and line not in {"Pleasant Events List", "249", "250", "251"} and not line.startswith(ignored_prefixes):
            values[current].append(line)

    if sorted(values) != list(range(1, 226)):
        raise RuntimeError("Expected all 225 Pleasant Events List entries")

    events = []
    for number, lines in values.items():
        title = clean_text(" ".join(lines))
        if number == 72:
            title = "Going hunting"
        if number == 225:
            title = title.removesuffix(" Other:")
        tags = []
        lower = title.lower()
        if any(word in lower for word in ("walk", "hiking", "camping", "beach", "garden", "outdoor", "woods", "moon", "stars", "nature")):
            tags.append("outdoors")
        if any(word in lower for word in ("friend", "family", "party", "group", "people", "date", "social", "children")):
            tags.append("with others")
        if any(word in lower for word in ("reading", "writing", "doodling", "meditating", "puzzle", "diary", "quiet", "alone")):
            tags.append("low energy")
        events.append({"id": number, "title": title, "tags": tags})
    return events


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("book_pdf", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "emotions.json").write_text(
        json.dumps({"source": "Emotion Regulation curriculum", "emotions": EMOTIONS}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    events = extract_pleasant_events(args.book_pdf, args.output_dir)
    (args.output_dir / "pleasant-events.json").write_text(
        json.dumps({"source": "Emotion Regulation Handout 16", "events": events}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"emotion_families": len(EMOTIONS), "pleasant_events": len(events)}))


if __name__ == "__main__":
    main()
