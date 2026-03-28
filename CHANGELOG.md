# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-03-28
### Added
- Dedicated full-tab Dashboard UI (`dashboard.html` / `dashboard.js`) replacing the fragile popup architecture.
- Dual-pane live execution log separating system events from available domain hits.
- Dynamic TLD selector allowing users to append `.com`, `.net`, `.io`, etc., directly from the UI.
- Support for comma-separated and newline-separated inputs.
- Export to JSON button for successfully verified domains.

### Changed
- Migrated background processes to a Manifest V3 Service Worker (`background.js`).
- **Critical Validation Overhaul:** Replaced basic text-matching with strict DOM validation using CSS classes and `data-qa` selectors to prevent false positives from alternative domain suggestions.
- Reversed validation logic flow to check for "Taken" status before "Available" status.

### Fixed
- Resolved issue where Chrome would kill the execution loop when the user clicked away from the extension popup.
- Fixed a bug where `.net` or `.org` cross-sell buttons triggered a false "AVAILABLE" status for `.com` domains.

## [2.0.0] - 2026-03-28
### Added
- Migrated from a Node.js Playwright script to a native Google Chrome Extension.
- Basic popup UI (`popup.html`) for pasting domain lists.
- Implemented `chrome.scripting.executeScript` for client-side DOM scraping to bypass Cloudflare `navigator.webdriver` detection.
- Randomized human-like delays (2000ms - 4000ms) between checks to prevent IP bans.

## [1.0.0] - 2026-03-28
### Added
- Initial headless Node.js Playwright script for checking domain availability via Hostinger.
- Automatic CSV parsing for domain prefixes.
- JSON output generation.