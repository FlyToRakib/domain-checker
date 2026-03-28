# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-29
### Finalized (Official Stable Release)
- **Architecture:** Implemented "Strategy Pattern" for the provider registry, allowing infinite future registrar plugins.
- **UI/UX:** Total redesign with SaaS aesthetic, consistent spacing, and Inter/JetBrains Mono font stack.
- **Features:** Added **Kill Switch (Stop Button)** to terminate long loops safely.
- **Features:** Added **CSS Loading Spinner** for real-time visual feedback.
- **Reliability:** Integrated battle-proof DOM selectors for **GoDaddy**, **Namecheap**, and **Hostinger**.
- **Accuracy:** Fixed "Suggested Domains" bug; scrapers now isolate only the exact match card.
- **API:** Implemented **RDAP API** as the default high-speed verification method.

## [0.5.0] - 2026-03-28
### Added (Beta)
- Initial Chrome Extension dashboard.
- Background Service Worker (Manifest V3).
- Bulk input parsing (comma and line-break support).

## [0.1.0] - 2026-03-28
### Added (Alpha)
- Prototype Node.js Playwright script for Hostinger scraping.