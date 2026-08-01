# Contributing to NOVRIX

Thank you for your interest in contributing to NOVRIX. We welcome contributions that improve the terminal's performance, security, or feature set.

## Development Setup
1. Fork the repository and clone your fork.
2. Install dependencies: `pnpm install`
3. Start the local development environment: `pnpm run dev:cf`

## Pull Request Process
- Ensure your code passes all linting and type checks (`pnpm run lint`, `pnpm run typecheck`).
- Keep PRs focused on a single feature or bug fix.
- Provide a clear description of the changes and any relevant issue numbers.

## Code Standards
- Follow the existing TypeScript and Tailwind CSS conventions.
- Avoid adding unnecessary dependencies; prefer edge-native and lightweight solutions.
- Ensure all new API endpoints include appropriate rate limiting and error handling.
