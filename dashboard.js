/**
 * ============================================================
 * DOMAIN CHECKER PRO v1.0.0
 * Modular Strategy Architecture - Production Ready
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
    namecheap: {
        type: 'SCRAPE',
        url: (d) => `https://www.namecheap.com/domains/registration/results/?domain=${d}`,
        wait: 16000,
        func: (domainToCheck) => {
            const text = document.body.innerText.toLowerCase();
            if (text.includes("verify you are human") || text.includes("cloudflare")) return "CLOUDFLARE";
            const exactMatchCard = document.querySelector('.standard-container article');
            if (!exactMatchCard) return "LOADING_TIMEOUT";
            const isTaken = exactMatchCard.classList.contains('unavailable') || !!exactMatchCard.querySelector('.label.taken') || !!exactMatchCard.querySelector('.domain-button button.domain-agents');
            if (isTaken) return "TAKEN";
            const isAvailable = exactMatchCard.classList.contains('available') || !!exactMatchCard.querySelector('.domain-button button.available') || exactMatchCard.innerText.toLowerCase().includes("is available");
            return isAvailable ? "AVAILABLE" : "UNKNOWN";
        }
    },
    godaddy: {
        type: 'SCRAPE',
        url: (d) => `https://www.godaddy.com/en-pk/domainsearch/find?domainToCheck=${d}`,
        wait: 8000, 
        func: (domainToCheck) => {
            const text = document.body.innerText.toLowerCase();
            const domainLower = domainToCheck.toLowerCase();
            if (text.includes("verify you are human") || text.includes("access denied")) return "BLOCKED";
            const takenFeature = document.querySelector('[data-cy="exactMatchDomainTaken-feature"]');
            const dbsCard = document.querySelector('[data-cy="dbsCard"]');
            const takenBadge = document.querySelector('[data-cy="dbsV2-badge"]');
            const ariaTaken = document.querySelector('[aria-live="polite"]');
            const isAriaTaken = ariaTaken && ariaTaken.innerText.toLowerCase().includes("is taken");
            if (takenFeature || dbsCard || (takenBadge && takenBadge.innerText.includes("Taken")) || isAriaTaken) return "TAKEN";
            const availCard = document.querySelector('[data-cy="availcard"]');
            if (availCard && !isAriaTaken) {
                const cardText = availCard.innerText.toLowerCase();
                if (cardText.includes(domainLower) && !cardText.includes("alternative")) return "AVAILABLE";
            }
            return "UNKNOWN";
        }
    }
};

let isAborted = false;

document.getElementById('startBtn').addEventListener('click', async () => {
    const rawInput = document.getElementById('domainList').value;
    const providerKey = document.getElementById('providerSelect').value;
    const provider = PROVIDERS[providerKey];
    let tld = document.getElementById('tldInput').value.trim().toLowerCase();
    if (tld && !tld.startsWith('.')) tld = '.' + tld;

    const baseNames = rawInput.split(/[\n,]+/).map(d => d.trim()).filter(Boolean);
    const domains = baseNames.map(name => name + tld);

    if (domains.length === 0) return alert("Please enter at least one domain name.");

    // UI State Management
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
    stopBtn.disabled = false;
    stopBtn.textContent = "Stop Scan";
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

    log(`[INIT] Provider: ${providerKey.toUpperCase()} | Count: ${domains.length}`, 'sys');

    let workerTab = null;
    if (provider.type === 'SCRAPE') workerTab = await chrome.tabs.create({ active: false });

    for (let i = 0; i < domains.length; i++) {
        if (isAborted) {
            log(`[STOPPED] Session terminated by user at domain ${i + 1}.`, 'warn');
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

        const msg = `[${i + 1}/${domains.length}] ${domain} → ${status}`;
        if (status === "AVAILABLE") {
            log(msg, 'avail');
            log(domain, 'avail', availLog);
            results.push(domain);
        } else {
            log(msg, status === "TAKEN" ? 'taken' : 'warn');
        }

        const waitTime = provider.type === 'API' ? 350 : (Math.floor(Math.random() * 2000) + 2500);
        await new Promise(r => setTimeout(r, waitTime));
    }

    if (workerTab) chrome.tabs.remove(workerTab.id);
    
    btn.disabled = false;
    stopBtn.style.display = 'none';
    spinner.style.display = 'none';
    btnText.textContent = "Scan Availability";
    log(`[COMPLETE] Session finished. Found ${results.length} available domains.`, 'sys');

    if (results.length > 0) {
        exportBtn.disabled = false;
        exportBtn.onclick = () => {
            const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            chrome.downloads.download({ url, filename: `checked_${Date.now()}.json` });
        };
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    isAborted = true;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('stopBtn').textContent = "Stopping...";
});