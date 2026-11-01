export const Y_AXIS_CHART_PADDING = 3;
export const Y_AXIS_WIDTH = 26;
export const Y_AXIS_RIGHT_WIDTH = 36;

/**
 * Computes the optimal left Y-axis width (in px) for an indicator based on its tickFormatter output.
 * Dynamically sizes the axis with generous responsive breathing room so tick values never touch
 * or clip outside the panel border on any viewport size.
 */
export function getLeftYAxisWidth(
  formatter?: ((v: number) => string) | null,
  sampleDomainOrValues?: readonly number[] | number[],
): number {
  if (!formatter) return 26;
  try {
    const rawValues: number[] = [];
    if (sampleDomainOrValues && sampleDomainOrValues.length > 0) {
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (const v of sampleDomainOrValues) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          rawValues.push(v);
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }
      if (minVal !== Infinity && maxVal !== -Infinity) {
        rawValues.push(minVal, maxVal, (minVal + maxVal) / 2, 0);
      }
    } else {
      rawValues.push(-100, -25, -10, -5, -1, -0.5, 0, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000);
    }

    let maxChars = 0;
    for (const v of rawValues) {
      try {
        const formatted = formatter(v);
        if (formatted && typeof formatted === 'string' && formatted.length > maxChars) {
          maxChars = formatted.length;
        }
      } catch {
        // continue
      }
    }

    if (maxChars <= 2) return 26; // "50", "0"
    if (maxChars <= 3) return 28; // "100", "2.1"
    if (maxChars <= 4) return 34; // "1.05", "4.2%", "5800"
    if (maxChars <= 5) return 40; // "102.5", "$2650", "5.25%", "$8.5T"
    if (maxChars <= 6) return 48; // "$22.0T", "-1.08%", "-0.50%", "100 pp"
    if (maxChars <= 7) return 52; // "-10.50%", "$120.5B"
    if (maxChars <= 8) return 58; // "-120.50%", "$5,196B"
    return Math.min(68, Math.ceil(maxChars * 6.6) + Y_AXIS_CHART_PADDING + 4);
  } catch {
    return 26;
  }
}
