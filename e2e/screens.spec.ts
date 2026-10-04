// Design pass: every page at phone, tablet and desktop widths, light and dark. Saved under test-results/screens.
import { expect, test } from '@playwright/test';

const SET = '?level=ssc&subject=physics&mcq=6&cq=2&seed=5';
const PAGES: [string, string][] = [
  ['home', '/'],
  ['bank', '/ssc/physics/'],
  ['build', `/ssc/physics/build${SET}`],
  ['practice', `/practice${SET}`],
  ['mock', '/ssc/physics/mock'],
  ['print', `/print${SET}`],
  ['board', '/board'],
  ['board-subject', '/board/ssc/physics'],
  ['admission', '/admission'],
  ['admission-varsity', '/admission/varsity'],
];

for (const scheme of ['light', 'dark'] as const) {
  for (const width of [375, 768, 1280]) {
    test(`screens ${scheme} ${width}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      for (const [name, path] of PAGES) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, `${name} scrolls sideways at ${width}px`).toBe(false);
        await page.screenshot({ path: `test-results/screens/${name}-${width}-${scheme}.png`, fullPage: true });
      }
      await ctx.close();
    });
  }
}
