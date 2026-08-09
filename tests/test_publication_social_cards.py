from __future__ import annotations

import unittest
from pathlib import Path

import yaml
from PIL import Image

from social_generator.scripts.social import render_cards


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "site" / "assets" / "social" / "social-cards.yml"
PUBLICATION_PATH = ROOT / "site" / "_publication.yml"


def normalized(value: object) -> str:
    return " ".join(str(value).split())


class AuthoredSocialCardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        manifest = yaml.safe_load(MANIFEST_PATH.read_text(encoding="utf-8"))
        cls.cards = {card["slug"]: card for card in manifest["cards"]}
        cls.publication = yaml.safe_load(
            PUBLICATION_PATH.read_text(encoding="utf-8")
        )

    def test_registered_authored_types_define_the_card_contract(self) -> None:
        expected = {
            "learn-lesson": ("article", "Learn"),
            "research-article": ("article", "Research"),
            "benchmark-report": ("benchmark", "Sage vs GNU"),
        }

        for page_type, (kind, category) in expected.items():
            with self.subTest(page_type=page_type):
                card = self.publication["bs-publication"]["pages"]["types"][
                    page_type
                ]["social-card"]
                self.assertEqual(card["kind"], kind)
                self.assertEqual(card["category"], category)

    def test_authored_cards_use_source_metadata_and_expected_outputs(self) -> None:
        cases = {
            "why-is-25-percent-the-take-point": {
                "source": "site/learn/cube/why-is-25-percent-the-take-point.qmd",
                "kind": "article",
                "category": "Learn",
                "pill": "Learn Article",
            },
            "sage-vs-gnu-additional-details": {
                "source": "site/research/sage-vs-gnu-additional-details.qmd",
                "kind": "article",
                "category": "Research",
                "pill": "Research Article",
            },
            "sage-vs-gnu-stage1": {
                "source": "site/engine-benchmark/sage-vs-gnu-stage1/index.qmd",
                "kind": "benchmark",
                "category": "Sage vs GNU",
                "pill": "Benchmark Report",
            },
        }

        for slug, expected in cases.items():
            with self.subTest(slug=slug):
                source = yaml.safe_load(
                    (ROOT / expected["source"]).read_text(encoding="utf-8")
                    .split("---", 2)[1]
                )
                card_data = self.cards[slug]
                card = render_cards.parse_card(
                    card_data,
                    list(self.cards).index(slug) + 1,
                )

                self.assertEqual(card.kind, expected["kind"])
                self.assertEqual(card.category, expected["category"])
                self.assertEqual(card.pill_label, expected["pill"])
                self.assertEqual(card.width, 1200)
                self.assertEqual(card.height, 630)
                self.assertEqual(normalized(card.title), normalized(source["title"]))
                self.assertEqual(
                    normalized(card.subtitle),
                    normalized(source.get("social-subtitle", source["description"])),
                )
                self.assertEqual(
                    card.output,
                    f"site/assets/social/generated/social-{slug}.png",
                )

                with Image.open(ROOT / card.output) as image:
                    self.assertEqual(image.format, "PNG")
                    self.assertEqual(image.size, (1200, 630))

    def test_default_card_remains_the_non_authored_fallback(self) -> None:
        default = self.cards["social-default"]
        self.assertEqual(default["kind"], "default")
        self.assertEqual(
            default["output"],
            "site/assets/social/generated/social-default.png",
        )


if __name__ == "__main__":
    unittest.main()
