import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright


GAME_URL = (Path(__file__).resolve().parents[1] / "src/garden_guard/static/index.html").as_uri()


class LayoutTests(unittest.TestCase):
    def test_game_fits_standard_browser_windows(self):
        viewports = [
            ("standard laptop", 1366, 768),
            ("compact laptop", 1280, 720),
        ]
        required_selectors = [
            "#board",
            "#restartBtn",
            "#sprinklerBtn",
            "#nextTurnBtn",
            "#upgradePanel",
            "#enemyPlan",
        ]

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                for name, width, height in viewports:
                    with self.subTest(viewport=name):
                        page = browser.new_page(viewport={"width": width, "height": height})
                        page.goto(GAME_URL)
                        page.locator("#board").wait_for()
                        metrics = page.evaluate(
                            """(selectors) => {
                                const doc = document.documentElement;
                                const body = document.body;
                                const boxes = Object.fromEntries(
                                    selectors.map((selector) => {
                                        const rect = document.querySelector(selector).getBoundingClientRect();
                                        return [selector, {
                                            left: rect.left,
                                            top: rect.top,
                                            right: rect.right,
                                            bottom: rect.bottom,
                                        }];
                                    })
                                );
                                return {
                                    viewportWidth: window.innerWidth,
                                    viewportHeight: window.innerHeight,
                                    scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
                                    scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
                                    boxes,
                                };
                            }""",
                            required_selectors,
                        )
                        page.close()

                        self.assertLessEqual(metrics["scrollWidth"], width + 1)
                        self.assertLessEqual(metrics["scrollHeight"], height + 1)
                        for selector, box in metrics["boxes"].items():
                            self.assertGreaterEqual(box["left"], 0, selector)
                            self.assertGreaterEqual(box["top"], 0, selector)
                            self.assertLessEqual(box["right"], metrics["viewportWidth"] + 1, selector)
                            self.assertLessEqual(box["bottom"], metrics["viewportHeight"] + 1, selector)
            finally:
                browser.close()


if __name__ == "__main__":
    unittest.main()
