import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLeftYAxisWidth, Y_AXIS_CHART_PADDING } from '../../lib/sentiment/yAxisUtils.ts';

test('getLeftYAxisWidth calculates safe non-clipping widths for all FRED and macro formatters', () => {
  const cases = [
    {
      name: 'FRED Fed Balance Sheet ($T)',
      formatter: (v) => `$${(v / 1e6).toFixed(1)}T`,
      samples: [7.5e6, 8.9e6, 9.2e6],
      minWidth: 38,
      maxWidth: 52,
    },
    {
      name: 'M2 Money Supply ($T)',
      formatter: (v) => `$${(v / 1e12).toFixed(1)}T`,
      samples: [20.5e12, 21.4e12],
      minWidth: 44,
      maxWidth: 52,
    },
    {
      name: 'Yield / Percentage with 2 decimals (e.g. -0.50%, 4.25%)',
      formatter: (v) => `${v.toFixed(2)}%`,
      samples: [-0.5, 0.25, 4.25, 12.5],
      minWidth: 44,
      maxWidth: 54,
    },
    {
      name: 'Yield / Percentage with 1 decimal (e.g. 5.2%, 100.0%)',
      formatter: (v) => `${v.toFixed(1)}%`,
      samples: [0, 5.2, 100],
      minWidth: 33,
      maxWidth: 50,
    },
    {
      name: 'Jobless Claims (thousands)',
      formatter: (v) => `${(v / 1e3).toFixed(0)}K`,
      samples: [220e3, 350e3],
      minWidth: 33,
      maxWidth: 44,
    },
    {
      name: 'Real GDP ($T)',
      formatter: (v) => `$${(v / 1e3).toFixed(1)}T`,
      samples: [22.5e3, 28.1e3],
      minWidth: 38,
      maxWidth: 50,
    },
    {
      name: 'Reverse Repo (dynamic $T/$B/$M)',
      formatter: (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}T` : v >= 1 ? `$${v.toFixed(0)}B` : `$${(v * 1000).toFixed(0)}M`),
      samples: [450, 1200, 2400],
      minWidth: 38,
      maxWidth: 52,
    },
    {
      name: 'Basis point spread (+1.5, -2.0)',
      formatter: (v) => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)),
      samples: [-2.1, 0, 1.5],
      minWidth: 33,
      maxWidth: 44,
    },
    {
      name: 'Fear & Greed index (0 to 100)',
      formatter: (v) => v.toFixed(0),
      samples: [0, 25, 50, 75, 100],
      minWidth: 26,
      maxWidth: 34,
    },
  ];

  for (const c of cases) {
    const width = getLeftYAxisWidth(c.formatter, c.samples);
    assert.ok(
      width >= c.minWidth,
      `${c.name} calculated width ${width}px is less than required minimum ${c.minWidth}px`
    );
    assert.ok(
      width <= c.maxWidth,
      `${c.name} calculated width ${width}px exceeds reasonable max ${c.maxWidth}px`
    );

    // Compute longest formatted string in samples
    let maxLen = 0;
    for (const s of c.samples) {
      const str = c.formatter(s);
      if (str.length > maxLen) maxLen = str.length;
    }

    // Verify SVG layout geometry:
    // In monospace font (fontSize 10), each char is ~6.4px.
    // In Recharts orientation="left", props.x is (margin.left + width) = 3 + width.
    // Tick textAnchor="end" is at: (3 + width) - Y_AXIS_CHART_PADDING(3) = width.
    // Left edge of text starts at: width - (maxLen * 6.4).
    // We require positive internal clearance (>= 4px) inside the SVG container.
    const textWidthEstimate = maxLen * 6.4;
    const internalClearance = width - textWidthEstimate;
    assert.ok(
      internalClearance >= 4,
      `${c.name} has internal clearance ${internalClearance.toFixed(1)}px which is below safe 4px threshold`
    );

    // With container px-2 (8px padding), total clearance from panel border is >= 12px
    const totalBorderPadding = 8 + internalClearance;
    assert.ok(
      totalBorderPadding >= 12,
      `${c.name} total border clearance ${totalBorderPadding.toFixed(1)}px is below 12px`
    );
  }
});

test('getLeftYAxisWidth fallback handles undefined sample values gracefully', () => {
  const genericPercent = (v) => `${v.toFixed(1)}%`;
  const width = getLeftYAxisWidth(genericPercent);
  assert.ok(width >= 33 && width <= 58, `Fallback width ${width}px is within acceptable bounds`);
});

test('getLeftYAxisWidth handles null or missing formatter', () => {
  const width = getLeftYAxisWidth(null);
  assert.strictEqual(width, 26, 'Null formatter returns standard fallback 26px');
});
