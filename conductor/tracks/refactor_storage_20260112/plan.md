# Track Plan: Refactor Storage Logic

## Phase 1: Analysis & Design
- [ ] Task: Analyze existing storage implementation in src/background/storage.ts and src/fmg/storage to identify bottlenecks.
- [ ] Task: Design a new IStorage interface and a structured data schema for map data and user settings.
- [ ] Task: Document the new storage architecture and schema design.
- [ ] Task: Conductor - User Manual Verification 'Analysis & Design' (Protocol in workflow.md)

## Phase 2: Core Implementation
- [ ] Task: Implement the IStorage interface and a concrete LocalStorageAdapter (or IndexedDBAdapter if deemed necessary).
- [ ] Task: Create a StorageService class to manage data operations using the adapter.
- [ ] Task: Write unit tests for the StorageService to ensure data integrity and proper error handling.
- [ ] Task: Conductor - User Manual Verification 'Core Implementation' (Protocol in workflow.md)

## Phase 3: Integration & Refactoring
- [ ] Task: Refactor src/fmg/map-manager to utilize the new StorageService.
- [ ] Task: Update the background scripts (src/background/index.ts) to initialize and expose the new storage logic.
- [ ] Task: Verify that all map interactions (marking found, saving routes) work correctly with the new storage.
- [ ] Task: Conductor - User Manual Verification 'Integration & Refactoring' (Protocol in workflow.md)

## Phase 4: Migration & Cleanup
- [ ] Task: Implement a DataMigrationService to detect and upgrade old storage data to the new schema on startup.
- [ ] Task: Write comprehensive tests for the migration logic to guarantee NO data loss.
- [ ] Task: Deprecate and remove the old storage implementation code.
- [ ] Task: Conductor - User Manual Verification 'Migration & Cleanup' (Protocol in workflow.md)
