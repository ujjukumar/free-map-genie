# Agent Guidelines - Free Map Genie

This document provides instructions and guidelines for AI agents operating in the Free Map Genie repository.

## Commands

### Build & Development
- **Install dependencies:** `pnpm install`
- **Start (Watch mode):** `pnpm start` (Default), `pnpm start-chrome`, `pnpm start-firefox`
- **Build (Production):** `pnpm build`, `pnpm build-chrome`, `pnpm build-firefox`, `pnpm build-all`
- **Linting:** `pnpm lint` (Check), `pnpm lint-fix` (Fix)
- **Formatting:** `pnpm prettier` (Formats everything using Prettier)

### Testing
- **Run all tests (Silent):** `pnpm test`
- **Run all tests (Verbose):** `pnpm test-loud`
- **Run a single test:** `npx jest path/to/test.test.ts`
- **Run tests in watch mode:** `npx jest --watch`


---

## Code Style Guidelines

### 1. General
- **TypeScript:** Strictly use TypeScript for all logic. Avoid `any` where possible.
- **Indentation:** 4 spaces (enforced by `.editorconfig` and Prettier).
- **Semicolons:** Required (enforced by ESLint and Prettier).
- **Quotes:** Use double quotes for strings (`"string"`).
- **Trailing Commas:** None (per `.prettierrc`).

### 2. Naming Conventions
- **Classes:** `PascalCase`. 
  - Internal FMG classes often use an `FMG_` prefix (e.g., `FMG_Storage`, `FMG_Data`).
- **Functions & Variables:** `camelCase` (e.g., `getValue`, `isMini`).
- **Interfaces & Types:** `PascalCase`.
  - Do NOT use the `I` prefix for interfaces (e.g., `SettingsProps`, not `ISettingsProps`).
- **React Components:** `PascalCase` (e.g., `IconButton`, `TabView`).
- **Files:** `kebab-case` for utility files (e.g., `api-filter.ts`), `PascalCase` or `index.tsx` for components.

### 3. Imports
- Use ESM `import` and `export`.
- Use path aliases defined in `tsconfig.json`:
  - `@components/*` -> `src/components/*`
  - `@shared/*` -> `src/shared/*`
  - `@fmg/*` -> `src/fmg/*`
- Group imports:
  1. React and third-party libraries.
  2. Internal aliases (`@components`, `@fmg`, etc.).
  3. Relative imports.
  4. Stylesheets (`.scss`).

### 4. React Patterns
- **Functional Components:** Always use functional components with hooks.
- **Props:** Define props using `interface`.
- **Styling:** Use SCSS. Import the component's stylesheet at the top of the `.tsx` file.
- **Hooks:** Use standard hooks (`useState`, `useEffect`, `useMemo`, etc.).

### 5. Types & Namespaces
- Global types for Mapgenie (`MG`) and the extension (`FMG`) are defined in `src/@types/`.
- Refer to these namespaces for extension-specific data structures.
- Use `FMG.Extension.Settings`, `FMG.Storage.KeyData`, etc.

### 6. Error Handling & Logging
- **Errors:** Throw descriptive errors using `throw new Error("...")`.
- **Logging:** Use the custom `logger` utility from `@fmg/logger`.
  - `logger.debug(...)`: For development-only logs.
  - `logger.info(...)`: For general information.
  - `logger.warn(...)`: For potential issues.
  - `logger.error(...)`: For critical failures.
- **Production Safety:** `logger.debug` is automatically muted in production via the `__DEBUG__` constant.

### 7. Testing (Jest)
- Test files should be located in `tests/` and mirror the `src/` structure.
- Use `describe` and `it`/`test` blocks.
- Prefer `expect(...).toBe(...)` or `expect(...).toEqual(...)`.
- For async code, use `async/await` in tests.

---

## File Structure
- `src/`: Main source code.
  - `background/`: Extension background scripts.
  - `components/`: Shared React components.
  - `content/`: Content scripts that run on mapgenie.io.
  - `fmg/`: Core logic for the "Free Map Genie" unlocker.
  - `shared/`: Utilities shared across different parts of the extension.
  - `storage/`: Storage drivers and logic.
  - `@types/`: TypeScript declaration files.
- `tests/`: Jest test suite.
- `scripts/`: Build and maintenance scripts.
- `webpack/`: Webpack configuration parts.

## Common Patterns

### API Interception
Many features work by intercepting Mapgenie's API calls using `FMG_ApiFilter`. This is done to prevent actual network requests to Mapgenie's PRO-only endpoints and instead serve or modify data locally.
- Use `ApiFilter.install(window)` to get an instance.
- Register filters with `registerFilter(method, key, hasId, callback)`.
- The callback can return modified data or use the `block()` function to prevent the original request.

### Storage Management
The extension uses a layered storage system:
1. **Drivers:** Low-level storage access (e.g., `LocalStorageDriver`).
2. **Data:** High-level data management for specific map/user combinations (e.g., `FMG_Data`).
3. **Storage:** Orchestrates multiple data instances (e.g., `FMG_Storage`).
Always use the `FMG_Storage` or `FMG_Data` classes instead of direct `localStorage` access to ensure consistency and proper migration handling.

### Data Migration
When updating data structures, handle migrations in `src/fmg/storage/migration/`. Each migration should have its own file and be added to the migration orchestrator.

---

## Cursor/Copilot Rules
(No specific `.cursorrules` or `.github/copilot-instructions.md` were found in this repository. Follow the guidelines above as the primary source of truth.)
