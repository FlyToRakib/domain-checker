# Domain Checker

A robust, background-persistent Chrome Extension designed to automate bulk domain availability checks. Built to bypass basic bot mitigation (like Cloudflare) by executing DOM validation directly within a live browser tab.

## 🚀 Features

* **Background Execution:** Utilizes a Manifest V3 Service Worker to run checks in a dedicated, stable dashboard tab, preventing the process from dying when switching windows.
* **Advanced DOM Scraping:** Evaluates specific CSS classes and `data-qa` attributes rather than raw text, eliminating false positives from alternative domain suggestions (e.g., `.net` or `.org` cross-sells).
* **Bot Mitigation Handling:** Detects Cloudflare CAPTCHA intercepts and safely logs them without crashing the execution loop.
* **Flexible Input:** Accepts comma-separated or newline-separated lists of base domain names.
* **Dynamic TLD Support:** Select or type custom extensions (`.com`, `.io`, `.ai`, etc.) via the dashboard UI.
* **Humanized Throttling:** Built-in randomized delays (2–4 seconds) to prevent IP rate-limiting.
* **Automated JSON Export:** Instantly download a clean `.json` array of all available domains upon completion.

## 🛠️ Installation (Developer Mode)

Since this is an internal tool, it is run locally as an unpacked extension.

1. Clone this repository or download the source folder.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the folder containing the `manifest.json` file.
6. Pin the extension to your browser toolbar for quick access.

## 💻 Usage

1. Click the extension icon in your Chrome toolbar. This will launch the secure **Domain Checker Dashboard** in a new tab.
2. Paste your list of base domain names (e.g., `AxNode, ExNode, OxNode`) into the input field.
3. Select your desired Top-Level Domain (TLD) from the dropdown or type a custom one.
4. Click **Check Domain Availability**.
5. Monitor the live execution log on the left.
6. Once complete, click **Export Available (.json)** on the right to download your results.

## 🏗️ Architecture & Maintenance Note

This extension relies on `chrome.scripting.executeScript` to inject a validation function into `hostinger.com`. 

**⚠️ Important:** Web scraping is brittle by nature. If the host updates their frontend architecture, the CSS selectors in `dashboard.js` will need to be updated. 

The current critical selectors are:
* Available (Success Badge): `.h-domain-search-card__badge--success`
* Available (Cart Button): `[data-qa="add-to-cart-button"]`
* Taken (Text Wrapper): `.h-found-domain-cards-item__domain-taken-text`
* Taken (No Results): `.h-domain-finder-results__no-results`