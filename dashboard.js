/**
 * ============================================================
 * Domain Availability Checker - Bulk Search v1.2.0
 * Persistent Sessions, CSV Export, Dynamic Grid
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
customTldInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addCustomTld(); });


// ==========================================
// SESSION MANAGEMENT (LOCAL STORAGE)
// ==========================================
let savedSessions = [];
let activeSessionId = null;

async function loadSessions() {
    const data = await chrome.storage.local.get('dcp_sessions');
    savedSessions = data.dcp_sessions || [];
    renderSessionList();
}

// Added 'skipRenderList' parameter for performance optimization during tight loops
async function saveSessionData(sessionObj, skipRenderList = false) {
    const idx = savedSessions.findIndex(s => s.id === sessionObj.id);
    if (idx >= 0) savedSessions[idx] = sessionObj;
    else savedSessions.unshift(sessionObj);
    
    // Fire and forget storage update to prevent blocking
    chrome.storage.local.set({ dcp_sessions: savedSessions });
    
    if (!skipRenderList) {
        renderSessionList();
    }
}

async function deleteSession(id) {
    savedSessions = savedSessions.filter(s => s.id !== id);
    await chrome.storage.local.set({ dcp_sessions: savedSessions });
    renderSessionList();
    if (activeSessionId === id) {
        activeSessionId = null;
        document.getElementById('availLog').innerHTML = '';
        document.getElementById('exportBtn').disabled = true;
    }
}

async function renameSession(id, newName) {
    const idx = savedSessions.findIndex(s => s.id === id);
    if (idx >= 0 && newName) {
        savedSessions[idx].name = newName;
        await chrome.storage.local.set({ dcp_sessions: savedSessions });
        renderSessionList();
    }
}

// Clear All functionality
document.getElementById('clearAllBtn').addEventListener('click', async () => {
    if (confirm("Are you sure you want to delete all saved sessions? This action cannot be undone.")) {
        savedSessions = [];
        await chrome.storage.local.set({ dcp_sessions: [] });
        renderSessionList();
        document.getElementById('availLog').innerHTML = '';
        activeSessionId = null;
        document.getElementById('exportBtn').disabled = true;
    }
});

function renderSessionList() {
    const container = document.getElementById('sessionLog');
    container.innerHTML = '';
    
    if (savedSessions.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;margin-top:20px;">No saved sessions yet.</div>';
        return;
    }

    savedSessions.forEach(session => {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        div.innerHTML = `
            <div class="session-header">
                <div class="session-name">
                    ${session.name} 
                    <button class="edit-name-btn" data-id="${session.id}">✎</button>
                </div>
            </div>
            <div class="session-meta">Domains: ${Object.keys(session.grid).length} | TLDs: ${session.tlds.length}</div>
            <div class="session-actions">
                <button class="view-btn" data-id="${session.id}">View</button>
                <button class="csv-btn" data-id="${session.id}">CSV</button>
                <button class="del-btn" data-id="${session.id}">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('.edit-name-btn').forEach(btn => {
        btn.onclick = () => {
            const newName = prompt("Enter new session name:");
            renameSession(btn.getAttribute('data-id'), newName);
        };
    });
    container.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = () => {
            if(confirm("Delete this session?")) deleteSession(btn.getAttribute('data-id'));
        };
    });
    container.querySelectorAll('.view-btn').forEach(btn => {
        btn.onclick = () => openOverlayView(btn.getAttribute('data-id'));
    });
    container.querySelectorAll('.csv-btn').forEach(btn => {
        btn.onclick = () => downloadSessionCSV(btn.getAttribute('data-id'));
    });
}

loadSessions();

// ==========================================
// BULLETPROOF CSV EXPORT LOGIC
// ==========================================
function generateCSV(grid, tlds) {
    let csv = "Domain Name," + tlds.join(",") + "\n";
    for (const base in grid) {
        let row = [base];
        tlds.forEach(tld => {
            row.push(grid[base][tld] || "PENDING");
        });
        csv += row.join(",") + "\n";
    }
    return csv;
}

function triggerCSVDownload(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Universal trigger for blob downloads without strictly requiring bg worker permissions
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function downloadSessionCSV(sessionId) {
    const session = savedSessions.find(s => s.id === sessionId);
    if (!session) return;
    const csv = generateCSV(session.grid, session.tlds);
    triggerCSVDownload(csv, `${session.name.replace(/\s+/g, '_')}_${session.id}.csv`);
}

// Persistent listeners for Export buttons
document.getElementById('exportBtn').addEventListener('click', () => {
    if (activeSessionId) downloadSessionCSV(activeSessionId);
});

document.getElementById('overlayExportBtn').addEventListener('click', () => {
    if (activeOverlaySessionId) downloadSessionCSV(activeOverlaySessionId);
});


// ==========================================
// UI RENDERING & OVERLAY
// ==========================================
function buildTableHTML(grid, tlds, filterVal = 'ALL') {
    let html = '<table class="results-table"><thead><tr><th>Domain</th>';
    tlds.forEach(tld => { html += `<th>${tld}</th>`; });
    html += '</tr></thead><tbody>';

    Object.keys(grid).forEach(base => {
        const tldData = grid[base];
        if (filterVal !== 'ALL') {
            if (filterVal === 'AVAILABLE_ANY') {
                const hasAvail = Object.values(tldData).includes('AVAILABLE');
                if (!hasAvail) return;
            } else {
                if (tldData[filterVal] !== 'AVAILABLE') return; 
            }
        }

        html += `<tr><td><strong>${base}</strong></td>`;
        tlds.forEach(tld => {
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
    return html;
}

function renderCurrentTable() {
    if (!activeSessionId) return;
    const session = savedSessions.find(s => s.id === activeSessionId);
    if (!session) return;
    
    const filterVal = document.getElementById('tldFilter').value;
    document.getElementById('availLog').innerHTML = buildTableHTML(session.grid, session.tlds, filterVal);
}

document.getElementById('tldFilter').addEventListener('change', renderCurrentTable);

// Full Page Overlay Functions
const overlay = document.getElementById('sessionViewOverlay');
let activeOverlaySessionId = null;

function openOverlayView(sessionId) {
    const session = savedSessions.find(s => s.id === sessionId);
    if (!session) return;
    activeOverlaySessionId = sessionId;
    
    document.getElementById('overlayTitle').textContent = session.name;
    document.getElementById('overlayMeta').textContent = `Total Domains Checked: ${Object.keys(session.grid).length}`;
    document.getElementById('overlayTableArea').innerHTML = buildTableHTML(session.grid, session.tlds, 'ALL');
    
    overlay.style.display = 'flex';
}

document.getElementById('closeOverlayBtn').addEventListener('click', () => {
    overlay.style.display = 'none';
    activeOverlaySessionId = null;
});


// ==========================================
// SCANNING ENGINE
// ==========================================
let isAborted = false;

document.getElementById('startBtn').addEventListener('click', async () => {
    const rawInput = document.getElementById('domainList').value;
    const providerKey = document.getElementById('providerSelect').value;
    const provider = PROVIDERS[providerKey];
    
    const selectedTlds = Array.from(document.querySelectorAll('.tld-checkbox:checked')).map(cb => cb.value);
    if (selectedTlds.length === 0) return alert("Please select or add at least one domain extension (TLD).");

    const rawNames = rawInput.split(/[\n,]+/).map(d => d.trim()).filter(Boolean);
    if (rawNames.length === 0) return alert("Please enter at least one base domain.");

    // Setup Grid Data Structure & Queue
    let currentGrid = {};
    const scanQueue = [];

    rawNames.forEach(name => {
        const cleanName = name.split('.')[0].toLowerCase(); 
        currentGrid[cleanName] = {};
        selectedTlds.forEach(tld => {
            currentGrid[cleanName][tld] = 'PENDING';
            scanQueue.push({ base: cleanName, tld: tld, domain: cleanName + tld });
        });
    });

    // Initialize & Save New Session
    activeSessionId = Date.now().toString();
    const dateStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
    
    const newSession = {
        id: activeSessionId,
        name: `Scan ${dateStr}`,
        tlds: selectedTlds,
        grid: currentGrid,
        status: 'RUNNING'
    };
    
    // Render list immediately for the new session creation
    await saveSessionData(newSession, false); 

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

    // Set Filters for Current View
    filterDropdown.innerHTML = `<option value="ALL">All Scanned</option><option value="AVAILABLE_ANY">Available in Any</option>`;
    selectedTlds.forEach(tld => {
        const opt = document.createElement('option');
        opt.value = tld;
        opt.textContent = `Available in ${tld}`;
        filterDropdown.appendChild(opt);
    });
    filterDropdown.disabled = false;
    filterDropdown.value = 'ALL';

    renderCurrentTable();

    let totalFoundAvailable = 0;

    const log = (msg, type = '') => {
        const div = document.createElement('div');
        div.className = `entry ${type}`;
        div.textContent = msg;
        fullLog.appendChild(div);
        fullLog.scrollTop = fullLog.scrollHeight;
    };

    log(`[INIT] Session Started, Provider: ${providerKey.toUpperCase()} | Queued: ${scanQueue.length}`, 'sys');

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

        // Performance Optimization: Save in background without rebuilding Left Sidebar list.
        const activeSess = savedSessions.find(s => s.id === activeSessionId);
        if (activeSess) {
            activeSess.grid[item.base][item.tld] = status;
            saveSessionData(activeSess, true); // skipRenderList = true ensures no lag
            renderCurrentTable();
        }

        const msg = `[${i + 1}/${scanQueue.length}] ${domain} → ${status}`;
        if (status === "AVAILABLE") {
            totalFoundAvailable++;
            log(msg, 'avail');
        } else {
            log(msg, status === "TAKEN" ? 'taken' : 'warn');
        }

        const waitTime = provider.type === 'API' ? 350 : (Math.floor(Math.random() * 2000) + 2500);
        await new Promise(r => setTimeout(r, waitTime));
    }

    if (workerTab) chrome.tabs.remove(workerTab.id);
    
    // Final UI Cleanup
    btn.disabled = false;
    stopBtn.style.display = 'none';
    spinner.style.display = 'none';
    btnText.textContent = "Scan Availability";
    exportBtn.disabled = false;
    
    log(`[COMPLETE] Session finished, Data saved | Found: ${totalFoundAvailable}`, 'sys');
    
    const finalSess = savedSessions.find(s => s.id === activeSessionId);
    if(finalSess) {
        finalSess.status = 'COMPLETED';
        await saveSessionData(finalSess, false); // Final save, force list render to update any states if necessary
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    isAborted = true;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('stopBtn').textContent = "Stopping...";
});