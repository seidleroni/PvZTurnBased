import re
import unittest
from pathlib import Path


STATIC = Path("src/garden_guard/static")


class StaticContractTests(unittest.TestCase):
    def test_html_references_existing_assets(self):
        html = (STATIC / "index.html").read_text(encoding="utf-8")
        for asset in ["styles.css", "game.js"]:
            self.assertIn(asset, html)
            self.assertTrue((STATIC / asset).exists())

    def test_game_has_expected_levels_and_units(self):
        game = (STATIC / "game.js").read_text(encoding="utf-8")
        self.assertIn("Training Patch", game)
        self.assertIn("Sprinkler Hill", game)
        self.assertIn("Bucket Bridge", game)
        self.assertIn("Moonlit Maze", game)
        for unit in ["Pea Cadet", "Sun Medic", "Tater Bunker", "Sprout Tank"]:
            self.assertIn(unit, game)
        for enemy in ["Fast Sneaker", "Shield Bucket", "Grumpy Stomper"]:
            self.assertIn(enemy, game)

    def test_css_uses_responsive_board(self):
        css = (STATIC / "styles.css").read_text(encoding="utf-8")
        self.assertRegex(css, re.compile(r"aspect-ratio:\s*1"))
        self.assertIn("@media", css)

    def test_turn_resolution_has_animation_contracts(self):
        game = (STATIC / "game.js").read_text(encoding="utf-8")
        css = (STATIC / "styles.css").read_text(encoding="utf-8")
        for name in ["animateShot", "animateHeal", "animateMove", "animateAttack"]:
            self.assertIn(name, game)
        for class_name in ["shot-beam", "heal-beam", "move-ghost", "damage-pop"]:
            self.assertIn(class_name, css)

    def test_sound_effects_are_synthesized_locally(self):
        html = (STATIC / "index.html").read_text(encoding="utf-8")
        game = (STATIC / "game.js").read_text(encoding="utf-8")
        self.assertIn("soundBtn", html)
        self.assertIn("AudioContext", game)
        self.assertIn("playSound", game)
        self.assertIn("gardenGuardSound", game)

    def test_upgrades_removal_and_powers_are_available(self):
        html = (STATIC / "index.html").read_text(encoding="utf-8")
        game = (STATIC / "game.js").read_text(encoding="utf-8")
        for element_id in ["upgradePanel", "shovelBtn", "rallyBtn", "sprinklerBtn", "starBadge"]:
            self.assertIn(element_id, html)
        for behavior in ["UPGRADES", "upgradeDefender", "removeDefender", "useRallyShot", "useSprinkler"]:
            self.assertIn(behavior, game)

    def test_referenced_svg_assets_exist(self):
        game = (STATIC / "game.js").read_text(encoding="utf-8")
        for asset in re.findall(r"assets/[a-z-]+\\.svg", game):
            self.assertTrue((STATIC / asset).exists(), asset)


if __name__ == "__main__":
    unittest.main()
