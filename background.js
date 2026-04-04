/**
 * Domain Availability Checker - Background Service Worker
 * Version 1.0.1 Stable
 */

chrome.action.onClicked.addListener(async () => {
    const url = chrome.runtime.getURL("dashboard.html");

    // Search for an existing dashboard tab
    const tabs = await chrome.tabs.query({ url: url });

    if (tabs.length > 0) {
        // If it exists, bring it to the front (focus it)
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
        // If it doesn't exist, create a new one
        chrome.tabs.create({ url: 'dashboard.html' });
    }
});