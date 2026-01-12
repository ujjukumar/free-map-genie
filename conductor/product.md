# Product Guide - FMG: Free Mapgenie PRO!

## Initial Concept
Mapgenie PRO unlocker

## Overview
FMG (Free Mapgenie PRO) is a browser extension designed to provide users with Mapgenie PRO features for free. It achieves this by mocking user authentication and localizing data management directly within the browser, bypassing server-side restrictions.

## Target Audience
The primary target audience consists of users who want to access Mapgenie PRO features—such as restricted maps and markers—without a paid subscription.

## Core Features
- **PRO Content Unlocking:** Grants access to premium maps and markers that are typically locked behind a PRO subscription.
- **User Authentication Mocking:** Simulates a PRO user status to enable restricted features on the Mapgenie website.
- **Data Localization:** Redirects API calls to local browser storage, allowing for personalized marker tracking without relying on Mapgenie's servers.

## Key Constraints & Limitations
- **No Cross-Device Sync:** Because data is stored locally in the browser, progress (e.g., marked locations) does not synchronize across different devices or browsers.
- **Session Requirement:** The extension requires the user to be logged in (or have the "mock user" enabled via the extension popup) to function correctly.
- **Data Persistence:** Clearing the browser's cache or local storage will result in the loss of all localized Mapgenie data. Users are encouraged to use the manual import/export features for backups.

## Strategic Motivations
- **API Bypass:** Localization is used specifically to circumvent Mapgenie's API limitations and subscription checks.
- **Privacy & Ownership:** By keeping data local, users maintain full ownership and privacy of their map progress.

## Supported Platforms
The extension is built for major Chromium-based and Gecko-based browsers, specifically:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
