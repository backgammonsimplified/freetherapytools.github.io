from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


def test_learn_mindfulness_is_the_only_mindfulness_home():
    quarto = (SITE / "_quarto.yml").read_text(encoding="utf-8")
    navigation = (SITE / "_learn-navigation.yml").read_text(encoding="utf-8")
    site_generator = (ROOT / "scripts" / "learn_glossary_site.py").read_text(
        encoding="utf-8"
    )

    assert "href: learn/mindfulness/index.qmd" in quarto
    assert "href: mindfulness/index.qmd" not in quarto
    assert 'home_source"] = "learn/mindfulness/index.qmd"' in site_generator
    assert 'href: learn/mindfulness/index.qmd' in navigation
    assert 'href: mindfulness/index.qmd' not in navigation
    assert not (SITE / "mindfulness" / "index.qmd").exists()


def test_mindfulness_home_explains_the_full_skill_map():
    content = (SITE / "learn" / "mindfulness" / "index.qmd").read_text(
        encoding="utf-8"
    )

    for required in (
        "being aware of the present moment with acceptance",
        "thoughts and cognitions",
        "emotions",
        "Window of Tolerance",
        "Distress Tolerance",
        "Wise Mind",
        "The WHAT skills",
        "The HOW skills",
        "Operations of Mind",
        "Being Mind",
        "Doing Mind",
    ):
        assert required in content


def test_foundations_is_original_summary_not_handout_reproduction():
    content = (
        SITE / "learn" / "mindfulness" / "mindfulness-foundations.qmd"
    ).read_text(encoding="utf-8")

    for required in (
        "being aware of the present moment with acceptance",
        "Increase control of your mind",
        "Experience reality more directly",
        "Mindfulness is not emptying the mind",
        "Window of Tolerance",
        "Distress Tolerance",
        "The WHAT skills",
        "Observe",
        "Describe",
        "Participate",
        "The HOW skills",
        "Non-Judgmentally",
        "One-Mindfully",
        "Effectively",
        "Operations of Mind: Being and Doing",
        "Reasonable Mind",
        "Emotion Mind",
        "Wise Mind",
    ):
        assert required in content

    assert "Checker Play" not in content
    assert "Original Source" not in content
    assert "/resources/clean/mindfulness/" not in content
    assert "/resources/mindfulness/program-source/" not in content
