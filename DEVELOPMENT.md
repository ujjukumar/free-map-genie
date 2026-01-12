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
-   `yarn build`: Builds the extension for production.
-   `yarn build-chrome`: Builds the extension strictly for Chrome (production).
-   `yarn build-firefox`: Builds the extension strictly for Firefox (production).
-   `yarn build-all`: Builds for both browsers.

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
