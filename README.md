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

## ✨ AI Brand Name Generator

The extension includes a built-in **AI-powered brand name generator** using Google Gemini / Gemma models. It operates in two modes:

| Tab | Purpose |
|---|---|
| **Generate New Brand** | Create completely new brand/domain name ideas from scratch based on niche, description, style, and rules |
| **Make Brand Unique** | Take existing domain keywords and regenerate them with prefixes/suffixes to create unique variations |

### Setup

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open the AI popup via **"✨ AI: Generate Brand Name"** button
3. Paste your API key in the header input field (saved automatically to local storage)
4. Select your model: **Gemma 4** or **Gemini**

---

## 🧪 Prompt Tester (Debug Script)

Use this script to **preview the exact prompt** that gets sent to the Gemini API — without making any API calls or modifying the extension.

### How to use

1. Open the extension dashboard
2. Click **"✨ AI: Generate Brand Name"** to open the popup
3. Fill in / modify any form fields you want to test
4. Press **F12** → go to the **Console** tab
5. Copy-paste the script below and press **Enter**
6. Both final prompts will be printed using your **live form values**

> **Note:** This script is 100% read-only. It does NOT modify any code, storage, or DOM elements.

### Script

```js
(function () {
    console.clear();

    // Helper: Read tag values from a tag-input container
    function readTags(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return '(container not found)';
        return Array.from(container.querySelectorAll('.tag'))
            .map(t => t.childNodes[0].nodeValue.trim())
            .join(', ');
    }

    // TAB 1: GENERATE NEW BRAND
    const count       = document.getElementById('aiCount')?.value       || '10';
    const charLength  = document.getElementById('aiCharLength')?.value  || '6';
    const niche       = document.getElementById('aiNiche')?.value.trim()       || '';
    const description = document.getElementById('aiDescription')?.value.trim() || '';
    const rules       = readTags('aiRulesContainer');
    const style       = readTags('aiStyleContainer');
    const whatToAvoid  = document.getElementById('aiWhatToAvoid')?.value.trim() || '';
    const responseSchema = "Output ONLY a single line of comma-separated domain name keywords. No extra spaces, no numbering, no explanations, no extra text, no line breaks, no quotes. Follow exactly this format: name, name, name";

    const prompt1 = `
Generate exactly ${count} domain name ideas.
Niche Category: ${niche}
Brand Description: ${description}
Max Character Length: ${charLength}
Flowing Rules: ${rules}
Style: ${style}
What to avoid:
${whatToAvoid}

Response Schema:
${responseSchema}
`;

    // TAB 2: MAKE BRAND UNIQUE
    const baseDomains = document.getElementById('uniqueBaseDomains')?.value.trim() || '(empty)';
    const category    = document.getElementById('uniqueCategory')?.value.trim()    || 'eCommerce';
    const uniqueRules = readTags('uniqueRulesContainer');

    const prefixEnabled = document.getElementById('aiEnablePrefix')?.checked;
    const prefixVal     = document.getElementById('aiPrefixes')?.value.trim();
    const suffixEnabled = document.getElementById('aiEnableSuffix')?.checked;
    const suffixVal     = document.getElementById('aiSuffixes')?.value.trim();

    let affixPrompt = "";
    if (prefixEnabled && prefixVal) affixPrompt += `Prefix character length exactly: ${prefixVal}\n`;
    if (suffixEnabled && suffixVal) affixPrompt += `Suffix character length exactly: ${suffixVal}\n`;

    const prompt2 = `
Task: Make the following base domains unique by applying prefixes and/or suffixes or logical variations based on the rules. Return ONLY the finalized domain names.
Brand Category: ${category}
Base Domains: ${baseDomains}
Flowing Rules: ${uniqueRules}
${affixPrompt}
Response Schema:
${responseSchema}
`;

    // OUTPUT
    const sep = '═'.repeat(60);
    console.log(`\n${sep}`);
    console.log(`  📋 TAB 1: GENERATE NEW BRAND — Final Prompt`);
    console.log(sep);
    console.log(prompt1);
    console.log(`\n${sep}`);
    console.log(`  📋 TAB 2: MAKE BRAND UNIQUE — Final Prompt`);
    console.log(sep);
    console.log(prompt2);
    console.log(`\n${sep}`);
    console.log(`  📊 FIELD VALUES SNAPSHOT`);
    console.log(sep);
    console.log(`  [Tab 1] Count:        ${count}`);
    console.log(`  [Tab 1] Char Length:   ${charLength}`);
    console.log(`  [Tab 1] Niche:         ${niche}`);
    console.log(`  [Tab 1] Rules:         ${rules}`);
    console.log(`  [Tab 1] Style:         ${style}`);
    console.log(`  [Tab 1] What to Avoid: ${whatToAvoid.substring(0, 60)}...`);
    console.log(`  ──────────────────────────────`);
    console.log(`  [Tab 2] Category:      ${category}`);
    console.log(`  [Tab 2] Base Domains:  ${baseDomains.substring(0, 60)}...`);
    console.log(`  [Tab 2] Rules:         ${uniqueRules}`);
    console.log(`  [Tab 2] Prefix:        ${prefixEnabled ? `ON (${prefixVal})` : 'OFF'}`);
    console.log(`  [Tab 2] Suffix:        ${suffixEnabled ? `ON (${suffixVal})` : 'OFF'}`);
    console.log(sep);
    console.log('✅ Done! These are the EXACT prompts that would be sent to the Gemini API.');
})();
```