/**
 * ============================================================
 * Domain Availability Checker - Bulk Search v1.2.0
 * Persistent Sessions, CSV Export, Dynamic Grid
 * ============================================================
 */

const checkRdapWithFallback = async (primaryUrl, domain) => {
    try {
        if (!window.rdapBootstrapCache) {
            const res = await fetch('https://data.iana.org/rdap/dns.json');
            const data = await res.json();
            window.rdapBootstrapCache = {};
            data.services.forEach(service => {
                const tlds = service[0];
                const urls = service[1];
                tlds.forEach(tld => { window.rdapBootstrapCache[tld] = urls[0]; });
            });
        }

        let primaryStatus = 0;
        if (primaryUrl) {
            try {
                const response = await fetch(primaryUrl);
                primaryStatus = response.status;
                if (primaryStatus === 200) return "TAKEN";
                if (primaryStatus === 429) return "RATE_LIMIT";
            } catch (e) {
                // Primary failed (e.g. DNS or CORS error), proceed to fallback
            }
        }

        const tld = domain.split('.').pop();
        const baseUrl = window.rdapBootstrapCache[tld];

        if (!baseUrl) {
            try {
                const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`, {
                    headers: { 'accept': 'application/dns-json' }
                });
                const dnsData = await dnsRes.json();
                if (dnsData.Status === 0 && dnsData.Answer) return "TAKEN";
                if (dnsData.Status === 3) return "AVAILABLE";
                return "UNKNOWN";
            } catch (e) {
                return "UNSUPPORTED_TLD";
            }
        }

        if (primaryUrl && primaryUrl.startsWith(baseUrl)) {
            if (primaryStatus === 404) return "AVAILABLE";
            if (primaryStatus === 200) return "TAKEN";
            if (primaryStatus === 429) return "RATE_LIMIT";
            return "ERROR";
        }

        const fallbackResponse = await fetch(`${baseUrl}domain/${domain}`);
        if (fallbackResponse.status === 404) return "AVAILABLE";
        if (fallbackResponse.status === 200) return "TAKEN";
        if (fallbackResponse.status === 429) return "RATE_LIMIT";

        return "ERROR";
    } catch (e) {
        return "ERROR";
    }
};

const PROVIDERS = {
    icann_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(null, domain) },
    rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.org/domain/${domain}`, domain) },
    google_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://pubapi.registry.google/rdap/domain/${domain}`, domain) },
    godaddy_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.nic.godaddy/domain/${domain}`, domain) },
    hostinger: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.hostinger.com/domain/${domain}`, domain) },
    namecheap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.namecheap.com/domain/${domain}`, domain) },
    verisign_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.verisign.com/com/v1/domain/${domain}`, domain) },
    pir_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.publicinterestregistry.org/rdap/domain/${domain}`, domain) },
    identity_digital_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.identitydigital.services/rdap/domain/${domain}`, domain) },
    nominet_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.nominet.uk/uk/domain/${domain}`, domain) },
    eurid_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.eurid.eu/rdap/domain/${domain}`, domain) },
    afnic_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.nic.fr/domain/${domain}`, domain) },
    cira_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.ca.fury.ca/rdap/domain/${domain}`, domain) },
    nicbr_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.registro.br/domain/${domain}`, domain) },
    cnnic_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.cnnic.cn/domain/${domain}`, domain) },
    amazon_rdap: { type: 'API', check: async (domain) => checkRdapWithFallback(`https://rdap.nominet.uk/amazon/domain/${domain}`, domain) }
};

// ==========================================
// TLD UI MANAGEMENT
// ==========================================
const DEFAULT_TLDS = ['.com', '.net', '.org', '.io', '.ai', '.app', '.dev', '.co', '.me', '.info'];
const tldContainer = document.getElementById('tldContainer');
const customTldInput = document.getElementById('customTldInput');
const addCustomTldBtn = document.getElementById('addCustomTldBtn');
const selectAllTldsBtn = document.getElementById('selectAllTldsBtn');

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

    // Add remove button for custom TLDs
    if (!DEFAULT_TLDS.includes(tld)) {
        const removeBtn = document.createElement('span');
        removeBtn.innerText = ' ×';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.color = '#ff5555';
        removeBtn.style.marginLeft = '4px';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.title = "Remove this custom extension";
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            label.remove();
            updateSelectAllBtnState();
        });
        label.appendChild(removeBtn);
    }

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
function updateSelectAllBtnState() {
    const checkboxes = document.querySelectorAll('.tld-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    selectAllTldsBtn.innerText = allChecked ? "Deselect All" : "Select All";
}

tldContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('tld-checkbox')) {
        updateSelectAllBtnState();
    }
});

selectAllTldsBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.tld-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    updateSelectAllBtnState();
});

// Initial state
updateSelectAllBtnState();


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
            if (confirm("Delete this session?")) deleteSession(btn.getAttribute('data-id'));
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
    if (finalSess) {
        finalSess.status = 'COMPLETED';
        await saveSessionData(finalSess, false); // Final save, force list render to update any states if necessary
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    isAborted = true;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('stopBtn').textContent = "Stopping...";
});

// ==========================================
// AI BRAND NAME GENERATOR
// ==========================================

const getAiDomainBtn = document.getElementById('getAiDomainBtn');
const aiPopupOverlay = document.getElementById('aiPopupOverlay');
const closeAiPopupBtn = document.getElementById('closeAiPopupBtn');

getAiDomainBtn.addEventListener('click', () => {
    aiPopupOverlay.style.display = 'block';
});

closeAiPopupBtn.addEventListener('click', () => {
    aiPopupOverlay.style.display = 'none';
});

const aiApiKey = document.getElementById('aiApiKey');
const aiEnablePrefix = document.getElementById('aiEnablePrefix');
const aiPrefixes = document.getElementById('aiPrefixes');
const aiEnableSuffix = document.getElementById('aiEnableSuffix');
const aiSuffixes = document.getElementById('aiSuffixes');
const aiGenerateBtn = document.getElementById('aiGenerateBtn');
const aiRegenerateUniqueBtn = document.getElementById('aiRegenerateUniqueBtn');
const aiErrorIndicator = document.getElementById('aiErrorIndicator');
const aiResultsArea = document.getElementById('aiResultsArea');
const aiResultsList = document.getElementById('aiResultsList');

chrome.storage.local.get(['gemini_api_key'], (result) => {
    if (result.gemini_api_key) {
        aiApiKey.value = result.gemini_api_key;
    }
});

aiApiKey.addEventListener('change', () => {
    chrome.storage.local.set({ gemini_api_key: aiApiKey.value.trim() });
});

aiEnablePrefix.addEventListener('change', () => aiPrefixes.disabled = !aiEnablePrefix.checked);
aiEnableSuffix.addEventListener('change', () => aiSuffixes.disabled = !aiEnableSuffix.checked);

function setupTagInput(containerId, inputId) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);

    // Initial remove event listeners
    container.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.parentElement.remove());
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = input.value.trim();
            if (val) {
                const tag = document.createElement('div');
                tag.className = 'tag';
                tag.innerHTML = `${val} <span class="remove-tag">&times;</span>`;
                tag.querySelector('.remove-tag').addEventListener('click', (ev) => ev.target.parentElement.remove());
                container.insertBefore(tag, input);
                input.value = '';
            }
        }
    });
}

// Tabs Logic
const tabGenerateNew = document.getElementById('tabGenerateNew');
const tabMakeUnique = document.getElementById('tabMakeUnique');
const contentGenerateNew = document.getElementById('contentGenerateNew');
const contentMakeUnique = document.getElementById('contentMakeUnique');

tabGenerateNew.addEventListener('click', () => {
    tabGenerateNew.style.borderBottomColor = 'var(--brand-lime)';
    tabGenerateNew.style.color = 'var(--brand-lime)';

    tabMakeUnique.style.borderBottomColor = 'transparent';
    tabMakeUnique.style.color = 'var(--text-muted)';

    contentGenerateNew.style.display = 'flex';
    contentMakeUnique.style.display = 'none';
});

tabMakeUnique.addEventListener('click', () => {
    tabMakeUnique.style.borderBottomColor = 'var(--brand-lime)';
    tabMakeUnique.style.color = 'var(--brand-lime)';

    tabGenerateNew.style.borderBottomColor = 'transparent';
    tabGenerateNew.style.color = 'var(--text-muted)';

    contentMakeUnique.style.display = 'flex';
    contentGenerateNew.style.display = 'none';
});

setupTagInput('aiRulesContainer', 'aiRulesInput');
setupTagInput('aiStyleContainer', 'aiStyleInput');
setupTagInput('uniqueRulesContainer', 'uniqueRulesInput');

function getTagValues(containerId) {
    const container = document.getElementById(containerId);
    return Array.from(container.querySelectorAll('.tag')).map(t => t.childNodes[0].nodeValue.trim());
}

async function executeAiGeneration(promptTemplate, triggerBtn) {
    const apiKey = aiApiKey.value.trim();
    if (!apiKey) {
        aiErrorIndicator.innerText = "Please enter a Gemini API Key.";
        aiErrorIndicator.style.display = 'block';
        return;
    }

    const model = 'gemini-flash-latest';

    // Lock BOTH generate buttons to prevent override/double-click
    aiErrorIndicator.style.display = 'none';
    aiGenerateBtn.disabled = true;
    aiGenerateBtn.classList.add('ai-locked');
    aiRegenerateUniqueBtn.disabled = true;
    aiRegenerateUniqueBtn.classList.add('ai-locked');

    // Show centered loading spinner inside the process monitor
    aiResultsList.innerHTML = '';
    const loadingEl = document.createElement('div');
    loadingEl.className = 'ai-monitor-loading';
    loadingEl.innerHTML = `
        <div class="ai-spinner-ring"></div>
        <div class="ai-spinner-label">Generating ideas with AI...</div>
        <div class="ai-spinner-sublabel">Hang tight! Generation can take 10–60 seconds depending on prompt complexity.</div>
    `;
    aiResultsList.appendChild(loadingEl);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const requestPayload = {
            contents: [{ parts: [{ text: promptTemplate }] }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Failed to generate ideas.");
        }

        const data = await response.json();
        let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const domains = textResponse.split(',').map(d => d.trim().replace(/['"\[\]`*]/g, '')).filter(d => d.length > 0);

        if (domains.length === 0) {
            throw new Error("No valid domains generated.");
        }

        const finalString = domains.join(', ');

        // Clear the loading spinner
        aiResultsList.innerHTML = '';

        // Build bordered result card
        const card = document.createElement('div');
        card.className = 'ai-result-card';

        const nameEl = document.createElement('div');
        nameEl.className = 'ai-result-text';
        nameEl.innerText = finalString;

        const actionsRow = document.createElement('div');
        actionsRow.className = 'ai-result-actions';

        // Append All button
        const appendBtn = document.createElement('button');
        appendBtn.className = 'ai-append-btn';
        appendBtn.innerHTML = '➕ Append All';

        appendBtn.addEventListener('click', () => {
            const domainListEl = document.getElementById('domainList');
            const currentVals = domainListEl.value.trim();
            domainListEl.value = currentVals ? currentVals + (currentVals.endsWith(',') ? ' ' : ', ') + finalString : finalString;
            appendBtn.innerHTML = '✔ Appended';
            appendBtn.disabled = true;
            // Close the overlay popup after appending
            aiPopupOverlay.style.display = 'none';
        });

        // Copy All button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'ai-copy-btn';
        copyBtn.innerHTML = '📋 Copy All';

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(finalString).then(() => {
                copyBtn.innerHTML = '✔ Copied';
                copyBtn.disabled = true;
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy All';
                    copyBtn.disabled = false;
                }, 2000);
            });
        });

        actionsRow.appendChild(appendBtn);
        actionsRow.appendChild(copyBtn);
        card.appendChild(nameEl);
        card.appendChild(actionsRow);
        aiResultsList.appendChild(card);

    } catch (e) {
        aiResultsList.innerHTML = '';
        aiErrorIndicator.innerText = e.message;
        aiErrorIndicator.style.display = 'block';
    } finally {
        // Unlock BOTH buttons
        aiGenerateBtn.disabled = false;
        aiGenerateBtn.classList.remove('ai-locked');
        aiRegenerateUniqueBtn.disabled = false;
        aiRegenerateUniqueBtn.classList.remove('ai-locked');
    }
}

aiGenerateBtn.addEventListener('click', () => {
    const count = document.getElementById('aiCount').value;
    const charLength = document.getElementById('aiCharLength').value;
    const niche = document.getElementById('aiNiche').value.trim();
    const description = document.getElementById('aiDescription').value.trim();
    const rules = getTagValues('aiRulesContainer').join(', ');
    const style = getTagValues('aiStyleContainer').join(', ');
    const whatToAvoid = document.getElementById('aiWhatToAvoid').value.trim();
    const responseSchema = "Output ONLY a single line of comma-separated domain name keywords. No extra spaces, no numbering, no explanations, no extra text, no line breaks, no quotes. Follow exactly this format: name, name, name";

    const promptTemplate = `
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

    executeAiGeneration(promptTemplate, aiGenerateBtn);
});


aiRegenerateUniqueBtn.addEventListener('click', () => {
    const baseDomains = document.getElementById('uniqueBaseDomains').value.trim();
    const category = document.getElementById('uniqueCategory').value.trim();

    if (!baseDomains) {
        aiErrorIndicator.innerText = "Please enter at least one base domain.";
        aiErrorIndicator.style.display = 'block';
        return;
    }

    const rules = getTagValues('uniqueRulesContainer').join(', ');
    const responseSchema = "Output ONLY a single line of comma-separated domain name keywords. No extra spaces, no numbering, no explanations, no extra text, no line breaks, no quotes. Follow exactly this format: name, name, name";

    let affixPrompt = "";
    if (aiEnablePrefix.checked && aiPrefixes.value.trim()) affixPrompt += `Prefix character length exactly: ${aiPrefixes.value.trim()}\n`;
    if (aiEnableSuffix.checked && aiSuffixes.value.trim()) affixPrompt += `Suffix character length exactly: ${aiSuffixes.value.trim()}\n`;

    const promptTemplate = `
Task: Make the following base domains unique by applying prefixes and/or suffixes or logical variations based on the rules. Return ONLY the finalized domain names.
Brand Category: ${category}
Base Domains: ${baseDomains}
Flowing Rules: ${rules}
${affixPrompt}

Response Schema:
${responseSchema}
`;

    executeAiGeneration(promptTemplate, aiRegenerateUniqueBtn);
});