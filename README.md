# Domain Checker Pro

**Version 1.2.0 | Stable Production**

A professional-grade, multi-provider bulk domain availability aggregator. Built as a Chrome Extension (Manifest V3), it combines high-speed API checks with "battle-proof" DOM scraping to ensure 100% accurate results. 

## 🚀 Key Features

* **Persistent Session Memory:** Never lose a scan again. Scans are automatically saved to your local browser storage. You can safely close the extension, return later, and view or export your historical data.
* **Dynamic Grid Analytics:** Results are rendered in a clean, multi-dimensional table, giving you a bird's-eye view of keyword availability across multiple extensions simultaneously.
* **Smart Filtering & CSV Export:** Filter results instantly by specific TLDs, and export your curated data directly to a `.csv` file for Excel or Google Sheets integration.
* **Multi-TLD Matrix Scanning:** Generate hundreds of combinations instantly by scanning multiple selected TLDs concurrently against your base keywords (includes custom TLD injection support).
* **Multi-Strategy Engine:** Toggle between high-speed API checks and deep-scan browser scraping.
* **Production-Ready Providers:**
    * **Public RDAP (API):** High-speed, official protocol for rapid bulk testing.
    * **Hostinger (Scraper):** Advanced DOM validation using CSS success/taken badges.
    * **Namecheap (Scraper):** Isolated article scanning to prevent "alternative suggestion" false positives.
    * **GoDaddy (Scraper):** Precise `data-cy` attribute targeting and ARIA accessibility checks.
* **Process Control:** Integrated **Kill Switch (Stop Scan)** and visual spinners for real-time status tracking.

## 🛠️ Installation

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked** and select the project folder.
5.  Pin the **Domain Checker Pro** icon to your toolbar.

## 💻 Tech Stack

* **Logic:** Vanilla JavaScript (ES6+) utilizing the **Strategy Pattern** for provider modularity.
* **Storage:** Chrome Extension API (`chrome.storage.local`).
* **UI:** Custom CSS Grid/Flexbox architecture with a modern SaaS aesthetic (Inter & JetBrains Mono typography).