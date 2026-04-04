# Domain Checker Pro

**Version 1.1.0 | Stable Production**

A professional-grade, multi-provider bulk domain availability aggregator. Built as a Chrome Extension (Manifest V3), it combines high-speed API checks with "battle-proof" DOM scraping to ensure 100% accurate results across multiple registrars. 

## 🚀 Key Features

* **Multi-TLD Matrix Scanning:** Generate hundreds of combinations instantly by scanning multiple selected TLDs concurrently against your base keywords.
* **Custom Extension Support:** Easily inject unlisted or niche TLDs (like `.xyz` or `.country`) into your bulk scanning queue.
* **Smart Input Sanitization:** Paste raw lists without fear; the engine auto-strips existing extensions from base keywords to prevent duplicate extensions (e.g., `name.com.net`).
* **Multi-Strategy Engine:** Toggle between high-speed API checks and deep-scan browser scraping.
* **Production-Ready Providers:**
    * **Public RDAP (API):** High-speed, official protocol for rapid bulk testing.
    * **Hostinger (Scraper):** Advanced DOM validation using CSS success/taken badges.
    * **Namecheap (Scraper):** Isolated article scanning to prevent "alternative suggestion" false positives.
    * **GoDaddy (Scraper):** Precise `data-cy` attribute targeting and ARIA accessibility check.
* **Process Control:** Integrated **Kill Switch (Stop Scan)** and **Visual Spinner** for real-time status tracking.
* **Persistence:** Background service worker ensures the engine never sleeps or crashes when switching windows.
* **Data Export:** One-click JSON export for all verified available domains with uniquely generated filenames.

## 🛠️ Installation

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked** and select the project folder.
5.  Pin the **Domain Checker Pro** icon to your toolbar.

## 💻 Tech Stack

* **Logic:** JavaScript (ES6+) utilizing the **Strategy Pattern** for provider modularity.
* **UI:** Modern CSS with a SaaS aesthetic (Inter & JetBrains Mono typography).
* **Architecture:** Chrome Extension API Manifest V3.