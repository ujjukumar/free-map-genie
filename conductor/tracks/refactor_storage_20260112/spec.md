# Track Spec: Refactor Storage Logic

## Context
The current storage logic for localized map data (markers, categories, user progress) is critical for the "Free Mapgenie PRO" experience. As users track more items, the efficiency and reliability of this local storage become paramount. Current implementations may suffer from performance bottlenecks or unstructured data management.

## Goals
- Improve the performance of data read/write operations.
- Enhance the reliability of data persistence.
- Decouple the storage implementation from the core application logic to allow for future backend swaps (e.g., moving from LocalStorage to IndexedDB).
- Ensure seamless migration of existing user data.

## Requirements
1.  **Storage Abstraction:** Create a generic storage interface to abstract the underlying persistence layer.
2.  **Schema Design:** Define a structured schema for storing map data, user preferences, and tracking progress.
3.  **Refactoring:** Update src/background/storage.ts and src/fmg/storage to use the new architecture.
4.  **Migration:** Develop a robust migration strategy to convert existing data to the new format without data loss.
5.  **Backward Compatibility:** Ensure the extension remains functional during the transition.

## Non-Goals
- Syncing data across devices (this is a local-only extension).
- Changing the external Mapgenie API interactions (this track is purely about local storage).
