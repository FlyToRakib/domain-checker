# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-04-05
### Added (Major Feature Update)
- **Persistent Sessions:** Scans are now automatically saved to local storage (`chrome.storage.local`). Users can rename, delete, or view past sessions anytime without losing data on page reload.
- **Dynamic Table View:** Replaced the flat log of available hits with a dynamic, multi-dimensional grid mapping base domains to their respective TLD statuses.
- **TLD Filtering System:** Added a dropdown filter to easily isolate results by specific extensions or view domains available in *any* TLD.
- **CSV Export Engine:** Fully replaced JSON export with a robust, locally generated CSV export for easy spreadsheet integration.
- **Session History Overlay:** Implemented a full-page UI overlay to cleanly view and export historical scan data.
- **Clear All Data:** Added a one-click danger button to wipe all saved session history.

### Changed
- **UI Architecture:** Upgraded to a 3-column top grid layout. Applied strict `max-height` constraints and internal scrollbars to TLD selection, Process Monitor, and Results panels for a perfectly aligned, non-breaking layout.
- **CSS Separation:** Extracted all inline styles into a dedicated `dashboard.css` file for better caching, performance, and best-practice maintainability.
- **Enhanced Logging:** Start and Completion logs now display exact Provider usage, Queue counts, and Total Found counts for better observability.

### Fixed
- **Performance Bottleneck:** Decoupled the active scanning loop from the UI rendering cycle of the "Saved Sessions" list. Scans now run at maximum speed (matching v1.1.0) while saving data asynchronously.
- **Export Trigger Bug:** Rebuilt the download trigger using a bulletproof DOM-injected Blob anchor to guarantee CSV downloads fire correctly across all browser states.

## [1.1.0] - 2026-04-04
### Added
- **Multi-TLD Matrix:** Added a dynamic checkbox array allowing users to scan multiple domain extensions simultaneously.
- **Custom TLD Injection:** Users can now type and add custom extensions (e.g., `.xyz`, `.co.uk`).
- **Dynamic File Naming:** Added randomized IDs to exports to prevent overwriting.

### Changed
- **Smart Input Sanitization:** Automatically strips pasted TLDs from the base domain box to prevent duplication errors.

## [1.0.0] - 2026-03-29
### Finalized (Official Stable Release)
- **Architecture:** Implemented "Strategy Pattern" for provider plugins.
- **UI/UX:** SaaS aesthetic with Inter/JetBrains Mono typography.
- **Features:** Added Kill Switch and CSS Loading Spinner.
- **Reliability:** Battle-proof DOM selectors for GoDaddy, Namecheap, and Hostinger.

## [0.5.0] - 2026-03-28
### Added (Beta)
- Initial Chrome Extension dashboard & Background Service Worker.

## [0.1.0] - 2026-03-28
### Added (Alpha)
