import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');

test('Insights page route is deleted from app directory', () => {
  const insightsDir = path.join(ROOT, 'app', 'insights');
  assert.equal(fs.existsSync(insightsDir), false, 'app/insights must not exist');
});

test('Sitemap specifies only the three canonical public pages', () => {
  const sitemapXml = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  assert.ok(sitemapXml.includes('<loc>https://novrix.io/</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://novrix.io/sentiment</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://novrix.io/documentation</loc>'));
  assert.equal(sitemapXml.includes('insights'), false, 'sitemap must not include /insights');
});

test('Cloudflare Pages 301 redirects preserve domain equity for legacy insights route', () => {
  const redirects = fs.readFileSync(path.join(ROOT, 'public', '_redirects'), 'utf8');
  assert.ok(redirects.includes('/insights         /sentiment                301'));
  assert.ok(redirects.includes('/insights/        /sentiment                301'));
  assert.ok(redirects.includes('/insights/*       /sentiment                301'));
});

test('AI and LLM discoverability manifests document only three canonical routes', () => {
  const llmsTxt = fs.readFileSync(path.join(ROOT, 'public', 'llms.txt'), 'utf8');
  assert.equal(llmsTxt.includes('| `/insights` |'), false, 'llms.txt must not list /insights');

  const llmsFull = fs.readFileSync(path.join(ROOT, 'public', 'llms-full.txt'), 'utf8');
  assert.equal(llmsFull.includes('/insights'), false, 'llms-full.txt must not reference /insights');

  const aiTxt = fs.readFileSync(path.join(ROOT, 'public', 'ai.txt'), 'utf8');
  assert.equal(aiTxt.includes('/insights'), false, 'ai.txt must not reference /insights');
});
