/**
 * Opens the global auth gate modal from anywhere in the app.
 * Call this instead of routing to /terminal for module access.
 */
export function openAuthGate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-auth-gate'));
  }
}
