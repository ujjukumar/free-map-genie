# Development Guide

Welcome to the **Free Map Genie** development guide! This document will help you get started with contributing to the project.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (Latest LTS recommended)
- **Yarn** (v1.22.22 or compatible)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/V1P3R-FMG/free-map-genie.git
    cd free-map-genie
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

## Available Scripts

In the project directory, you can run:

### Development
-   `yarn start`: Runs the build in watch mode.
-   `yarn start-chrome`: Runs the build in watch mode for Chrome development environment.
-   `yarn start-firefox`: Runs the build in watch mode for Firefox development environment.

### Building
-   `yarn build`: Builds the extension for production (Release mode).
-   `yarn build-chrome`: Builds the extension strictly for Chrome (production/release mode).
-   `yarn build-firefox`: Builds the extension strictly for Firefox (production/release mode).
-   `yarn build-all`: Builds for both browsers in production mode.

### Testing & Linting
-   `yarn test`: Runs the test suite (silent mode).
-   `yarn test-loud`: Runs the test suite with verbose output.
-   `yarn lint`: Lints the codebase using ESLint.
-   `yarn lint-fix`: Automatically fixes linting errors.
-   `yarn prettier`: Formats the code using Prettier.

### Utility
-   `yarn sign`: Signs the extension (requires configuration).
-   `yarn update-font`: Updates the icon font.

## Project Structure

-   `src/`: Source code for the extension.
-   `tests/`: Unit and integration tests.
-   `scripts/`: Build and utility scripts.
-   `assets/`: Static assets like images and fonts.
-   `docs/`: Documentation files.
-   `icons/`: Source icons.

## Technologies Used

-   **React**: UI library.
-   **TypeScript**: Static typing.
-   **Webpack**: Module bundler.
-   **Sass**: CSS preprocessor.
-   **Jest**: Testing framework.

## Loading in Microsoft Edge

Since Microsoft Edge is based on Chromium, you can use the Chrome build of the extension.

1.  **Build or Start the extension:**
    -   For development (with auto-reload): Run `yarn start-chrome`.
    -   For production: Run `yarn build-chrome`.

2.  **Open Extensions Page:**
    -   Open Edge and navigate to `edge://extensions`.

3.  **Enable Developer Mode:**
    -   Toggle the **Developer mode** switch (usually located in the sidebar or top right).

4.  **Load Unpacked Extension:**
    -   Click the **Load unpacked** button.
    -   Navigate to the project directory and select the `dist/fmg-chrome-vX.X.X` folder (the folder name will depend on the version and build mode).

---

## Recent Changes (January 2026)

### Unified Data Management System

A major refactoring was completed to unify the fragmented data management systems (save slots, import/export, GitHub sync) into a single, consistent architecture.

#### New Features

**1. Global Save Slots**
-   **5 Global Slots** (0-4) where Slot 0 is reserved as the "Sync Slot"
-   Each slot stores **all maps** (v3 format) instead of just the current map
-   Slots are accessible from any map/game
-   Automatic migration from old per-map slots to new global slots

**2. Unified Data Manager**
-   New `FMG_DataManager` class provides consistent API for all data operations
-   Unified export/import for both single map and all maps
-   GitHub sync operations go through the same interface

**3. Intelligent Import Merging**
-   Import now merges data by **gameId + mapId** (ignoring userId)
-   Automatically finds and consolidates duplicate map entries
-   Merges locationIds, categories, notes, and presets intelligently
-   Deletes old duplicate entries after merging

**4. GitHub Sync Enhancements**
-   Token validation with gist scope checking
-   Rate limiting protection with visual warnings
-   Encrypted token storage using extension-based AES-GCM encryption
-   Conflict detection for sync scenarios (detects when local data is newer)
-   Firefox manifest updated with GitHub API permissions

#### File Changes

**New Files:**
-   `src/fmg/storage/data-manager.ts` - Unified data management API
-   `src/fmg/storage/global-slots.ts` - Global slot management
-   `src/fmg/storage/migration/slot-migration.ts` - Migration from per-map to global slots
-   `src/fmg/storage/crypto.ts` - Token encryption utilities
-   `src/@types/fmg/crypto.d.ts` - Crypto type definitions

**Modified Files:**
-   `src/fmg/storage/data/import-all.ts` - Intelligent merge logic
-   `src/fmg/storage/data/github-sync.ts` - Rate limiting and validation
-   `src/fmg/storage/data/export-all.ts` - All-maps export
-   `src/fmg/storage/keys.ts` - Key matching utilities
-   `src/fmg/storage/data.ts` - Added lastModified tracking
-   `src/fmg/map-manager/index.ts` - Uses Data Manager
-   `src/storage/index.ts` - New channel handlers and migration
-   `src/popup/pages/data.tsx` - Updated UI for global slots
-   `src/content/map/ui/DataPanel/Slots.tsx` - Global slot UI
-   `src/manifest.firefox.json` - GitHub API permissions
-   `src/@types/fmg/storage/index.d.ts` - New type definitions

#### Behavior Changes

**Before:**
-   Save slots were per-map (4 slots per map)
-   GitHub download went to Slot 4 (hardcoded)
-   Import created duplicate entries for different userIds
-   Token stored in plaintext

**After:**
-   Save slots are global (5 slots for all maps)
-   GitHub download goes to Sync Slot (Slot 0)
-   Import merges duplicate maps automatically
-   Token encrypted with extension-based key
-   All operations consistently work with all maps

#### Migration

On first run after update, the system will:
1.  Detect legacy per-map slot keys (`fmg:slots:...`)
2.  Back up all legacy data
3.  Convert per-map slots to global slots (v3 format)
4.  Clean up old keys
5.  Log migration status to console

---

## Contributing

When contributing to this project, please follow these guidelines:

### Code Style
-   Use TypeScript for all logic
-   Use 4 spaces for indentation
-   Use double quotes for strings
-   Follow existing naming conventions (PascalCase for classes, camelCase for functions)

### Testing
-   Write tests for new features in the `tests/` directory
-   Run `yarn test` before submitting PRs
-   Ensure all tests pass

### Commit Messages
-   Use clear, descriptive commit messages
-   Reference issue numbers when applicable

### Documentation
-   Update this file when making significant architecture changes
-   Add JSDoc comments for public APIs
-   Update type definitions when adding new interfaces
