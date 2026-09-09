from __future__ import annotations

import unittest
from pathlib import Path

import yaml
from PIL import Image

from social_generator.scripts.social import render_cards


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "site" / "assets" / "social" / "social-cards.yml"


class SocialCardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        manifest = yaml.safe_load(MANIFEST_PATH.read_text(encoding="utf-8"))
        cls.cards = manifest["cards"]

    def test_manifest_contains_only_current_therapy_cards(self) -> None:
        self.assertEqual(
            [card["slug"] for card in self.cards], ["social-default", "glossary"]
        )
        serialized = MANIFEST_PATH.read_text(encoding="utf-8")
        self.assertIn("Free Therapy Tools", serialized)
        self.assertNotIn("Sage", serialized)
        self.assertNotIn("Backgammon", serialized)

    def test_cards_parse_against_the_renderer_contract(self) -> None:
        for index, card_data in enumerate(self.cards, start=1):
            card = render_cards.parse_card(card_data, index)
            self.assertEqual(card.width, 1200)
            self.assertEqual(card.height, 630)

    def test_tracked_card_images_have_expected_dimensions(self) -> None:
        for card in self.cards:
            with Image.open(ROOT / card["output"]) as image:
                self.assertEqual(image.format, "PNG")
                self.assertEqual(image.size, (1200, 630))


if __name__ == "__main__":
    unittest.main()
