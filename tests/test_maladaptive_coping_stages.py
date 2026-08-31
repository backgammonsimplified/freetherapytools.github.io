from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
LEARN = (ROOT / "site/learn/wellness/maladaptive-coping.qmd").read_text(encoding="utf-8")
TOOL = (ROOT / "site/tool-finder/stages-of-change/index.qmd").read_text(encoding="utf-8")
QUICK = (ROOT / "site/assets/skill-quick-tools.js").read_text(encoding="utf-8")
STYLES = (ROOT / "site/assets/skill-apps.css").read_text(encoding="utf-8")


SIGN_HEADINGS = [
    "Continuing despite consequences",
    "Avoiding situations where it is unavailable",
    "Feeling withdrawal or strong discomfort when stopping",
    "Keeping it secret",
    "Needing more for the same effect",
    "Finding it difficult to stop",
    "Taking larger risks or making larger sacrifices",
    "Explaining away other people's concern",
    "Relying on it to handle problems",
]

SIGN_EXPLANATIONS = [
    "You keep returning to the behaviour even though it is creating noticeable problems or costs.",
    "You start skipping social situations, activities, or places because you would not be able to engage in the coping behaviour there.",
    "Cutting back or stopping leads to noticeable physical or emotional discomfort.",
    "You hide, minimize, or avoid talking honestly about how often or how much you engage in the behaviour.",
    "What used to feel sufficient no longer has the same effect, so the amount, frequency, or intensity increases.",
    "You intend to cut back or stop but repeatedly find yourself returning to the behaviour.",
    "More time, money, safety, responsibilities, relationships, or other important parts of life are being traded for the behaviour.",
    "When people express concern, you find yourself dismissing, minimizing, or repeatedly finding reasons why their concern does not apply.",
    "The behaviour begins to feel necessary for managing stress, emotions, difficult situations, or everyday problems.",
]

PROMPTS = [
    "Is there a problem or coping pattern you may be minimizing, avoiding, or not yet ready to change? What do you notice about it?",
    "In what ways, if any, is this pattern affecting you or other people?",
    "What are your reasons for wanting to make a change?",
    "What are your reasons for not wanting to change yet, or for wanting things to stay as they are?",
    "What feelings come up when you think about making this change?",
    "What challenges or barriers would you need to work through?",
    "What practical steps could help you begin?",
    "Describe your current plan of action.",
    "Who or what could support you? How could that support help?",
    "If you encounter a roadblock, what will you do next?",
    "How will you keep track of your follow-through or hold yourself accountable in a useful way?",
    "Which action steps have worked well?",
    "Which action steps have not worked, or need to be adjusted?",
    "What has been most challenging about maintaining the change?",
    "How do you plan to sustain the changes over time?",
    "What do you think contributed to returning to the old pattern?",
    "How are you feeling about what happened?",
    "What can you learn from what happened?",
    "What is your plan for getting back on track or choosing your next step?",
]


def test_nine_signs_are_accessible_non_diagnostic_disclosures():
    assert LEARN.count('<details class="maladaptive-sign">') == 9
    assert LEARN.count('aria-expanded="false"') >= 9
    assert LEARN.count("<summary") >= 9
    for heading in SIGN_HEADINGS:
        assert heading in LEARN
    for explanation in SIGN_EXPLANATIONS:
        assert explanation in LEARN
    assert "These are signs to notice, not a diagnostic checklist." in LEARN
    assert "tiles should not be added together into a score" in LEARN
    assert "/resources/wellness/wellness-p035.jpg" not in LEARN
    assert "Use the Stages of Change reflection" in LEARN
    assert "maladaptive-sign summary:focus-visible" in STYLES
    assert 'details.addEventListener("toggle", syncExpanded)' in QUICK


def test_stages_learn_has_full_copy_and_source_cycle_image():
    for stage in (
        "Precontemplation — Not Considering Change Yet",
        "Contemplation — Thinking It Over",
        "Preparation — Getting Ready",
        "Action — Making the Change",
        "Maintenance — Keeping the Change Going",
        "Returning to an Old Pattern — Learning and Restarting",
    ):
        assert stage in LEARN
    sentence = "The overview above introduces the main forward-moving stages."
    image = "/resources/wellness/stages-of-change/stages-of-change-cycle.png"
    assert LEARN.index(sentence) < LEARN.index(image) < LEARN.index("### Precontemplation")
    assert LEARN.count(image) == 1
    assert 'class="change-path-graphic' not in LEARN
    assert 'marker-end="url(#change-path-arrow-learn)"' not in LEARN
    assert "/resources/wellness/wellness-p036.jpg" not in LEARN
    assert "## Handouts & Worksheets" not in LEARN
    assert "## Reference Materials" not in LEARN
    assert "Naloxone: Save a Life" not in LEARN
    assert "S-T-A-G-E" not in LEARN
    assert "Carepatron" not in LEARN


def test_source_transcriptions_are_clean_and_complete():
    required = [
        "Do you find yourself ignoring or denying a problem in your life? If yes, explain.",
        "Why shouldn't you make positive changes to alleviate this problem?",
        "What steps should you take to make a change?",
        "Do you have a support system? If yes, please elaborate.",
        "How are you holding yourself accountable?",
        "What action steps didn't work?",
        "How will you sustain your changes over time?",
        "Why do you think you relapsed?",
        "What is your plan of action to get back on track?",
        "Additional Note",
    ]
    for text in required:
        assert text in LEARN
    for resource in ("wellness-p037", "wellness-p038", "wellness-p039"):
        assert resource in LEARN
    for removed_resource in ("wellness-p034", "wellness-p035", "wellness-p036", "wellness-p040", "wellness-p041"):
        assert removed_resource not in LEARN
    for corrupted in ("9 Sige", "Precontempiatiaa", "Conqinued", "chR\"enge", "AiiåTcluaÉ"):
        assert corrupted not in LEARN


def test_stages_tool_has_six_choices_and_all_prompts_without_scoring():
    assert 'data-quick-app="stages-of-change"' in TOOL
    assert "/learn/wellness/maladaptive-coping.html#stages-of-change" in TOOL
    assert "STAGES_OF_CHANGE" in QUICK
    assert QUICK.count('data-stage-choice="${stage.id}"') == 1
    for prompt in PROMPTS:
        assert prompt in QUICK
    assert "Additional notes" in QUICK
    assert "Expand all" in QUICK and "Collapse all" in QUICK
    assert "not a calculated result or diagnosis" in QUICK
    assert "calculate a stage" not in QUICK
    assert "readiness score" not in QUICK
    assert "Name" not in TOOL and "Signature" not in TOOL
    assert "@media (max-width: 760px)" in STYLES
    assert ".change-path-arrows { display: none; }" in STYLES


class MaladaptiveCopingStagesTests(unittest.TestCase):
    def test_nine_signs(self):
        test_nine_signs_are_accessible_non_diagnostic_disclosures()

    def test_stages_learn(self):
        test_stages_learn_has_full_copy_and_source_cycle_image()

    def test_source_text(self):
        test_source_transcriptions_are_clean_and_complete()

    def test_stages_tool(self):
        test_stages_tool_has_six_choices_and_all_prompts_without_scoring()


if __name__ == "__main__":
    unittest.main()
