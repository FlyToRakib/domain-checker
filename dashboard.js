document.getElementById('startBtn').addEventListener('click', async () => {
    const textarea = document.getElementById('domainList').value;
    let tld = document.getElementById('tldSelect').value.trim();
    
    // Ensure TLD starts with a dot
    if (!tld.startsWith('.')) tld = '.' + tld;

    // Split by commas OR newlines, trim whitespace, and remove empties
    const baseNames = textarea.split(/[\n,]+/).map(d => d.trim()).filter(Boolean);
    
    if (baseNames.length === 0) {
        alert("Please enter at least one domain name.");
        return;
    }

    // Append TLD to all base names
    const domains = baseNames.map(name => name + tld);

    const btn = document.getElementById('startBtn');
    const exportBtn = document.getElementById('exportBtn');
    const fullLogBox = document.getElementById('fullLogBox');
    const availableLogBox = document.getElementById('availableLogBox');
    
    btn.disabled = true;
    exportBtn.disabled = true;
    let availableDomainsList = [];
    
    // UI Helpers
    function log(message, type = '', box = fullLogBox) {
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.textContent = message;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight; 
    }

    log(`Initializing scan for ${domains.length} domains...`, 'system');
    
    // Launch background worker tab
    let checkTab = await chrome.tabs.create({ active: false });

    for (let i = 0; i < domains.length; i++) {
        const targetDomain = domains[i];
        const url = `https://www.hostinger.com/domain-name-results?from=domain-name-search&domain=${targetDomain}`;
        
        try {
            await chrome.tabs.update(checkTab.id, { url: url });
            
            // Wait for React/Vue hydration on Hostinger's end
            await new Promise(r => setTimeout(r, 4500));

            // Inject the robust DOM Selector check, passing the targetDomain as an argument
            const results = await chrome.scripting.executeScript({
                target: { tabId: checkTab.id },
                args: [targetDomain], // Pass the current domain into the injected script
                func: (domainToCheck) => {
                    const text = document.body.innerText;
                    const normalizedText = text.toLowerCase();
                    const domainLower = domainToCheck.toLowerCase();
                    
                    // 1. Check for Bot Protection First
                    if (text.includes("Verify you are human") || text.includes("Cloudflare")) {
                        return "CLOUDFLARE";
                    }

                    // 2. STRICT TAKEN CHECK (Must run before checking for cart buttons)
                    const hasTakenTextClass = !!document.querySelector('.h-found-domain-cards-item__domain-taken-text');
                    const hasNoResultsClass = !!document.querySelector('.h-domain-finder-results__no-results');
                    const isExplicitlyTakenText = normalizedText.includes(`${domainLower} is already taken`) || 
                                                  normalizedText.includes("is already taken");

                    if (hasTakenTextClass || hasNoResultsClass || isExplicitlyTakenText) {
                        return "TAKEN";
                    }

                    // 3. STRICT AVAILABLE CHECK
                    const hasSuccessBadge = !!document.querySelector('.h-domain-search-card__badge--success');
                    const isExactMatchText = normalizedText.includes("exact match");
                    
                    // We only fall back to the add-to-cart button if the 'TAKEN' traps weren't triggered
                    const hasAddToCart = !!document.querySelector('[data-qa="add-to-cart-button"]');

                    if (hasSuccessBadge || isExactMatchText || hasAddToCart) {
                        return "AVAILABLE";
                    }

                    return "UNKNOWN";
                }
            });

            const status = results[0].result;
            const logPrefix = `[${i + 1}/${domains.length}] ${targetDomain} - `;
            
            if (status === "AVAILABLE") {
                log(`${logPrefix}AVAILABLE`, 'available');
                log(targetDomain, 'available', availableLogBox);
                availableDomainsList.push(targetDomain);
            } else if (status === "TAKEN") {
                log(`${logPrefix}TAKEN`, 'taken');
            } else if (status === "CLOUDFLARE") {
                log(`${logPrefix}BLOCKED BY CLOUDFLARE`, 'error');
            } else {
                log(`${logPrefix}TIMEOUT / UNKNOWN UI`, 'error');
            }

        } catch (error) {
            log(`[${i + 1}/${domains.length}] ${targetDomain} - SCRIPT INJECTION ERROR`, 'error');
        }

        // Anti-rate-limit delay (2-4 seconds)
        const delay = Math.floor(Math.random() * 2000) + 2000;
        await new Promise(r => setTimeout(r, delay));
    }

    // Teardown
    chrome.tabs.remove(checkTab.id);
    log(`Scan Complete. Found ${availableDomainsList.length} available domains.`, 'system');

    // Enable export if we found anything
    if (availableDomainsList.length > 0) {
        exportBtn.disabled = false;
        
        // Setup Export Button Data
        exportBtn.onclick = async () => {
            const blob = new Blob([JSON.stringify(availableDomainsList, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            await chrome.downloads.download({ url: url, filename: `available_domains_${tld.replace('.','')}.json` });
        };
    } else {
        log("No available domains to export.", 'error', availableLogBox);
    }

    btn.disabled = false;
});