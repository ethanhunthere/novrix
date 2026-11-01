export const Y_AXIS_CHART_PADDING = 3;
export const Y_AXIS_WIDTH = 26;
export const Y_AXIS_RIGHT_WIDTH = 36;

/**
 * Computes the optimal left Y-axis width (in px) for an indicator based on its tickFormatter output.
 * Dynamically tightens the axis for short indicators (e.g. 26-28px for ratios, FNG, percentages)
 * while providing safe breathing room for currency/negative numbers/trillions (38-50px) to prevent
 * tick values from clipping against the panel borders on any screen size.
 */
export function getLeftYAxisWidth(
  formatter?: ((v: number) => string) | null,
  sampleDomainOrValues?: readonly number[] | number[],
): number {
  if (!formatter) return 26;
  try {
    const testValues = sampleDomainOrValues && sampleDomainOrValues.length > 0
      ? sampleDomainOrValues
      : [-100, -25, -10, -5, -1, -0.5, 0, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 5000];
    let maxChars = 0;
    for (const v of testValues) {
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
    if (maxChars <= 6) return 46; // "$22.0T", "-10.5%", "-0.50%", "100 pp"
    if (maxChars <= 7) return 52; // "-10.50%", "$120.5B"
    return Math.min(58, Math.ceil(maxChars * 6.6) + Y_AXIS_CHART_PADDING + 4);
  } catch {
    return 26;
  }
}
