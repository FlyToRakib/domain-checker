/**
 * ============================================================
 * DOMAIN CHECKER v1.0 (DEV)
 * Modular Strategy Architecture
 * ============================================================
 */
const PROVIDERS = {
    rdap: {
        type: 'API',
        check: async (domain) => {
            try {
                const response = await fetch(`https://rdap.org/domain/${domain}`);
                if (response.status === 404) return "AVAILABLE";
                if (response.status === 200) return "TAKEN";
                return "RATE_LIMIT";
            } catch (e) { return "ERROR"; }
        }
    },
    hostinger: {
        type: 'SCRAPE',
        url: (d) => `https://www.hostinger.com/domain-name-results?domain=${d}`,
        wait: 5000,
        func: (domainToCheck) => {
            const text = document.body.innerText.toLowerCase();
            const domainLower = domainToCheck.toLowerCase();
            if (text.includes("verify you are human") || text.includes("cloudflare")) return "CLOUDFLARE";
            
            const isTaken = !!document.querySelector('.h-found-domain-cards-item__domain-taken-text') || 
                            !!document.querySelector('.h-domain-finder-results__no-results') ||
                            text.includes(`${domainLower} is already taken`);
            if (isTaken) return "TAKEN";

            const isAvail = !!document.querySelector('.h-domain-search-card__badge--success') || 
                            !!document.querySelector('[data-qa="add-to-cart-button"]') ||
                            text.includes("exact match");
            return isAvail ? "AVAILABLE" : "UNKNOWN";
        }
    },
    // Templates for later development
        namecheap: {
        type: 'SCRAPE',
        url: (d) => `https://www.namecheap.com/domains/registration/results/?domain=${d}`,
        wait: 7000, // Namecheap results sometimes take a moment to hydrate via AJAX
        func: (domainToCheck) => {
            const text = document.body.innerText.toLowerCase();
            const domainLower = domainToCheck.toLowerCase();

            // 1. Security/Cloudflare Check
            if (text.includes("verify you are human") || text.includes("cloudflare")) return "CLOUDFLARE";

            // 2. Isolate the "Exact Match" Card (Critical for accuracy)
            const exactMatchCard = document.querySelector('.standard-container article');
            
            // If the card doesn't exist yet, the page hasn't fully loaded
            if (!exactMatchCard) return "LOADING_TIMEOUT";

            // 3. UNAVAILABLE LOGIC (Check this first)
            const isTakenClass = exactMatchCard.classList.contains('unavailable');
            const hasTakenLabel = !!exactMatchCard.querySelector('.label.taken');
            const hasMakeOffer = !!exactMatchCard.querySelector('.domain-button button.domain-agents');

            if (isTakenClass || hasTakenLabel || hasMakeOffer) {
                return "TAKEN";
            }

            // 4. AVAILABLE LOGIC
            const isAvailableClass = exactMatchCard.classList.contains('available');
            const hasAddToCart = !!exactMatchCard.querySelector('.domain-button button.available');
            const exactMatchText = exactMatchCard.innerText.toLowerCase();

            if (isAvailableClass || hasAddToCart || exactMatchText.includes("is available")) {
                return "AVAILABLE";
            }

            // 5. Final Text Fallback (Last resort)
            if (text.includes(`${domainLower} is taken`) || text.includes("is already taken")) return "TAKEN";
            if (text.includes(`${domainLower} is available`)) return "AVAILABLE";

            return "UNKNOWN";
        }
    },

    godaddy: {
        type: 'SCRAPE',
        url: (d) => `https://www.godaddy.com/en-pk/domainsearch/find?domainToCheck=${d}`,
        wait: 8000, 
        func: (domainToCheck) => {
            const text = document.body.innerText.toLowerCase();
            const domainLower = domainToCheck.toLowerCase();

            // 1. Security/Bot Wall Check
            if (text.includes("verify you are human") || text.includes("access denied")) {
                return "BLOCKED";
            }

            // 2. STRICT TAKEN CHECK (Based on your provided HTML)
            // GoDaddy uses this specific feature wrapper when the EXACT match is taken
            const takenFeature = document.querySelector('[data-cy="exactMatchDomainTaken-feature"]');
            const dbsCard = document.querySelector('[data-cy="dbsCard"]'); // Broker Service Card
            const takenBadge = document.querySelector('[data-cy="dbsV2-badge"]');
            
            // Hidden accessibility text is also a very reliable "eye"
            const ariaTaken = document.querySelector('[aria-live="polite"]');
            const isAriaTaken = ariaTaken && ariaTaken.innerText.toLowerCase().includes("is taken");

            if (takenFeature || dbsCard || (takenBadge && takenBadge.innerText.includes("Taken")) || isAriaTaken) {
                return "TAKEN";
            }

            // 3. STRICT AVAILABLE CHECK
            // We look specifically for the "availcard" ONLY if it's NOT inside a "Great Alternative" section
            const availCard = document.querySelector('[data-cy="availcard"]');
            const availableTag = document.querySelector('[data-cy="availableCard-tag"]');
            
            if (availCard && !isAriaTaken) {
                const cardText = availCard.innerText.toLowerCase();
                // Ensure the available card is actually for our domain and not a suggestion
                if (cardText.includes(domainLower) && !cardText.includes("alternative")) {
                    return "AVAILABLE";
                }
            }

            // 4. FALLBACKS
            if (text.includes(`${domainLower} is taken`) || text.includes("domain taken")) return "TAKEN";
            if (text.includes(`${domainLower} is available`)) return "AVAILABLE";

            return "UNKNOWN";
        }
    },
};

// --- GLOBAL STATE ---
let isAborted = false;

document.getElementById('startBtn').addEventListener('click', async () => {
    // 1. Data Prep
    const rawInput = document.getElementById('domainList').value;
    const providerKey = document.getElementById('providerSelect').value;
    const provider = PROVIDERS[providerKey];
    let tld = document.getElementById('tldInput').value.trim().toLowerCase();
    if (tld && !tld.startsWith('.')) tld = '.' + tld;

    const baseNames = rawInput.split(/[\n,]+/).map(d => d.trim()).filter(Boolean);
    const domains = baseNames.map(name => name + tld);

    if (domains.length === 0) return alert("Enter at least one domain name.");

    // 2. UI Start State
    isAborted = false;
    const btn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const spinner = document.getElementById('btnSpinner');
    const btnText = document.getElementById('btnText');
    const exportBtn = document.getElementById('exportBtn');
    const fullLog = document.getElementById('fullLog');
    const availLog = document.getElementById('availLog');
    
    btn.disabled = true;
    stopBtn.style.display = 'block';
    spinner.style.display = 'block';
    btnText.textContent = "Scanning...";
    
    fullLog.innerHTML = "";
    availLog.innerHTML = "";
    let results = [];
    
    const log = (msg, type = '', box = fullLog) => {
        const div = document.createElement('div');
        div.className = `entry ${type}`;
        div.textContent = msg;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    };

    log(`[v1.0] Starting session: ${providerKey.toUpperCase()} for ${domains.length} items.`, 'sys');

    // 3. Worker Setup
    let workerTab = null;
    if (provider.type === 'SCRAPE') workerTab = await chrome.tabs.create({ active: false });

    // 4. Execution Loop
    for (let i = 0; i < domains.length; i++) {
        // KILL SWITCH CHECK
        if (isAborted) {
            log(`[ABORTED] Manually stopped by user at item ${i + 1}.`, 'warn');
            break;
        }

        const domain = domains[i];
        let status = "ERROR";

        if (provider.type === 'API') {
            status = await provider.check(domain);
        } else {
            try {
                await chrome.tabs.update(workerTab.id, { url: provider.url(domain) });
                await new Promise(r => setTimeout(r, provider.wait));
                const res = await chrome.scripting.executeScript({
                    target: { tabId: workerTab.id },
                    args: [domain],
                    func: provider.func
                });
                status = res[0].result;
            } catch (e) { status = "TAB_FAILURE"; }
        }

        const msg = `[${i + 1}/${domains.length}] ${domain} -> ${status}`;
        if (status === "AVAILABLE") {
            log(msg, 'avail');
            log(domain, 'avail', availLog);
            results.push(domain);
        } else {
            log(msg, status === "TAKEN" ? 'taken' : 'warn');
        }

        // Delay between checks
        const waitTime = provider.type === 'API' ? 300 : (Math.floor(Math.random() * 2000) + 2500);
        await new Promise(r => setTimeout(r, waitTime));
    }

    // 5. UI Reset State
    if (workerTab) chrome.tabs.remove(workerTab.id);
    
    btn.disabled = false;
    stopBtn.style.display = 'none';
    spinner.style.display = 'none';
    btnText.textContent = "Scan Availability";
    log(`[COMPLETE] Session finished. Found ${results.length} available.`, 'sys');

    if (results.length > 0) {
        exportBtn.disabled = false;
        exportBtn.onclick = () => {
            const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            chrome.downloads.download({ url, filename: `checked_${Date.now()}.json` });
        };
    }
});

// STOP BUTTON LOGIC
document.getElementById('stopBtn').addEventListener('click', () => {
    isAborted = true;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('stopBtn').textContent = "Stopping...";
});