import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');

test('Home page source has zero blocking inline style tags in components', () => {
  const footerHome = fs.readFileSync(path.join(ROOT, 'components', 'layout', 'FooterHome.tsx'), 'utf8');
  assert.equal(footerHome.includes('<style>'), false, 'FooterHome must not inject inline <style> tags');
});

test('Brand assets have high-TTL cache directives in public/_headers', () => {
  const headers = fs.readFileSync(path.join(ROOT, 'public', '_headers'), 'utf8');
  assert.ok(headers.includes('/logo.png'), 'logo.png must have explicit caching in _headers');
  assert.ok(headers.includes('max-age=604800'), 'logo.png must be cached with high max-age');
});

test('Terminal cycle monitor tabs have semantic ARIA roles for instant accessibility', () => {
  const monitor = fs.readFileSync(path.join(ROOT, 'components', 'home', 'TerminalCycleMonitor.tsx'), 'utf8');
  assert.ok(monitor.includes('role="tablist"'), 'Cycle monitor must have role tablist');
  assert.ok(monitor.includes('role="tab"'), 'Cycle monitor must have role tab');
  assert.ok(monitor.includes('aria-selected='), 'Cycle monitor must have aria-selected attribute');
});

test('Home page hero has primary call to action targeting sentiment', () => {
  const homePage = fs.readFileSync(path.join(ROOT, 'app', 'page.tsx'), 'utf8');
  assert.ok(homePage.includes('href="/sentiment"'), 'Home page must link to /sentiment');
  assert.ok(homePage.includes('Open Terminal'), 'Home action button must be Open Terminal');
});
