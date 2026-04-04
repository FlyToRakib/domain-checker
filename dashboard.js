/**
 * ============================================================
 * Domain Availability Checker - Bulk Search v1.1.0
 * Modular Strategy Architecture - Multi-TLD Supported
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

// ==========================================
// TLD UI MANAGEMENT
// ==========================================
const DEFAULT_TLDS = ['.com', '.net', '.org', '.io', '.ai', '.app', '.dev', '.co', '.me', '.info'];
const tldContainer = document.getElementById('tldContainer');
const customTldInput = document.getElementById('customTldInput');
const addCustomTldBtn = document.getElementById('addCustomTldBtn');

function createTldCheckbox(tld, isChecked = false) {
    const label = document.createElement('label');
    label.className = 'tld-pill';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = tld;
    input.className = 'tld-checkbox';
    input.checked = isChecked;

    label.appendChild(input);
    label.appendChild(document.createTextNode(tld));
    return label;
}

DEFAULT_TLDS.forEach(tld => tldContainer.appendChild(createTldCheckbox(tld, tld === '.com')));

function addCustomTld() {
    let tld = customTldInput.value.trim().toLowerCase();
    if (!tld) return;
    if (!tld.startsWith('.')) tld = '.' + tld;

    const existingCbs = Array.from(document.querySelectorAll('.tld-checkbox')).map(cb => cb.value);
    if (existingCbs.includes(tld)) {
        document.querySelector(`.tld-checkbox[value="${tld}"]`).checked = true;
    } else {
        const newEl = createTldCheckbox(tld, true);
        tldContainer.insertBefore(newEl, tldContainer.firstChild);
    }
    customTldInput.value = '';
}

addCustomTldBtn.addEventListener('click', addCustomTld);
customTldInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addCustomTld();
});


// ==========================================
// SCANNING ENGINE & TABLE RENDERING
// ==========================================
let isAborted = false;
let currentResultsGrid = {};
let currentSelectedTlds = [];

// Re-render table dynamically based on Filter selection
function renderTable() {
    const filterVal = document.getElementById('tldFilter').value;
    let html = '<table class="results-table"><thead><tr><th>Domain</th>';
    
    // Build Headers
    currentSelectedTlds.forEach(tld => {
        html += `<th>${tld}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Build Rows
    Object.keys(currentResultsGrid).forEach(base => {
        const tldData = currentResultsGrid[base];
        
        // Filtering Logic
        if (filterVal !== 'ALL') {
            if (filterVal === 'AVAILABLE_ANY') {
                const hasAvail = Object.values(tldData).includes('AVAILABLE');
                if (!hasAvail) return; // Hide row if NO domains are available
            } else {
                // If specific TLD selected, hide rows where that TLD is not available
                if (tldData[filterVal] !== 'AVAILABLE') return; 
            }
        }

        html += `<tr><td><strong>${base}</strong></td>`;
        currentSelectedTlds.forEach(tld => {
            const stat = tldData[tld];
            let icon = '<span class="status-pending">-</span>';
            if (stat === 'AVAILABLE') icon = '<span class="status-avail">✔</span>';
            else if (stat === 'TAKEN') icon = '<span class="status-taken">✖</span>';
            else if (stat !== 'PENDING') icon = `<span class="status-error" title="${stat}">!</span>`;
            
            html += `<td>${icon}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('availLog').innerHTML = html;
}

// Attach listener to Filter dropdown
document.getElementById('tldFilter').addEventListener('change', renderTable);


document.getElementById('startBtn').addEventListener('click', async () => {
    const rawInput = document.getElementById('domainList').value;
    const providerKey = document.getElementById('providerSelect').value;
    const provider = PROVIDERS[providerKey];
    
    currentSelectedTlds = Array.from(document.querySelectorAll('.tld-checkbox:checked')).map(cb => cb.value);
    if (currentSelectedTlds.length === 0) return alert("Please select or add at least one domain extension (TLD).");

    const rawNames = rawInput.split(/[\n,]+/).map(d => d.trim()).filter(Boolean);
    if (rawNames.length === 0) return alert("Please enter at least one base domain.");

    // Setup Grid Data Structure
    currentResultsGrid = {};
    const scanQueue = [];

    rawNames.forEach(name => {
        const cleanName = name.split('.')[0].toLowerCase(); 
        currentResultsGrid[cleanName] = {};
        currentSelectedTlds.forEach(tld => {
            currentResultsGrid[cleanName][tld] = 'PENDING';
            scanQueue.push({ base: cleanName, tld: tld, domain: cleanName + tld });
        });
    });

    // UI State Management
    isAborted = false;
    const btn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const spinner = document.getElementById('btnSpinner');
    const btnText = document.getElementById('btnText');
    const exportBtn = document.getElementById('exportBtn');
    const filterDropdown = document.getElementById('tldFilter');
    const fullLog = document.getElementById('fullLog');
    
    btn.disabled = true;
    stopBtn.style.display = 'block';
    stopBtn.disabled = false;
    stopBtn.textContent = "Stop Scan";
    spinner.style.display = 'block';
    btnText.textContent = "Scanning...";
    exportBtn.disabled = true;
    fullLog.innerHTML = "";

    // Populate dynamic filter options
    filterDropdown.innerHTML = `<option value="ALL">All Scanned</option><option value="AVAILABLE_ANY">Available in Any</option>`;
    currentSelectedTlds.forEach(tld => {
        const opt = document.createElement('option');
        opt.value = tld;
        opt.textContent = `Available in ${tld}`;
        filterDropdown.appendChild(opt);
    });
    filterDropdown.disabled = false;
    filterDropdown.value = 'ALL';

    // Render Initial Empty Table
    renderTable();

    let results = [];
    
    const log = (msg, type = '') => {
        const div = document.createElement('div');
        div.className = `entry ${type}`;
        div.textContent = msg;
        fullLog.appendChild(div);
        fullLog.scrollTop = fullLog.scrollHeight;
    };

    log(`[INIT] Provider: ${providerKey.toUpperCase()} | Queued: ${scanQueue.length}`, 'sys');

    let workerTab = null;
    if (provider.type === 'SCRAPE') workerTab = await chrome.tabs.create({ active: false });

    for (let i = 0; i < scanQueue.length; i++) {
        if (isAborted) {
            log(`[STOPPED] Session terminated by user at scan ${i + 1}.`, 'warn');
            break;
        }

        const item = scanQueue[i];
        const domain = item.domain;
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

        // Update Grid & Real-time UI Table
        currentResultsGrid[item.base][item.tld] = status;
        renderTable(); 

        const msg = `[${i + 1}/${scanQueue.length}] ${domain} → ${status}`;
        if (status === "AVAILABLE") {
            log(msg, 'avail');
            results.push(domain); // Original raw JSON export structure intact
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
    log(`[COMPLETE] Session finished. Found ${results.length} available.`, 'sys');

    if (results.length > 0) {
        exportBtn.disabled = false;
        exportBtn.onclick = () => {
            const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const randId = Math.floor(Math.random() * 1000000);
            chrome.downloads.download({ url, filename: `domain_list_${randId}.json` });
        };
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    isAborted = true;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('stopBtn').textContent = "Stopping...";
});