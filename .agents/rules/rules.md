---
trigger: always_on
---

# Browser Extension Development: Core Rules & Best Practices

This document defines the strict engineering standards and operational rules for browser extension development. The primary objective is **Zero-Regression Stability** and **High-Performance Reliability**.

---

## 1. The Golden Rule: Zero-Regression Updates
Every new update or feature implementation must guarantee 100% stability of existing workflows.
- **Functionality Parity:** No existing feature shall be removed, disabled, or broken during an update unless explicitly requested.
- **Logic Integrity:** New logic must be isolated or backward-compatible. Ensure that legacy data structures in `chrome.storage` are migrated or handled gracefully.
- **UI Persistence:** No UI element should break, shift unexpectedly, or lose its styling context. Updates must feel like an enhancement, never a disruption.

## 2. UI/UX & CSS Scoping
- **Shadow DOM Usage:** Always use the Shadow DOM for UI injections into host pages to prevent CSS leaking from the website or into the website.
- **Unique Prefixes:** All CSS classes and IDs must be prefixed (e.g., `extname-container`) to avoid collisions.
- **Visual Consistency:** Maintain a consistent design language. Do not introduce new color palettes or UI patterns unless specified in the project requirements.
- **Responsive Injection:** Ensure injected elements do not interfere with the host's layout (e.g., avoid `position: absolute` without proper container context; prefer fixed overlays or sidebars).

## 3. Code Architecture & Modularity
- **Modular Design:** Use a "Battle-Proof" modular architecture. Logic for Background Scripts, Content Scripts, and Popups must be strictly separated.
- **Strict Error Handling:** Wrap all Browser API calls (`chrome.*`) in `try-catch` blocks or use promise wrappers. Provide meaningful fallbacks for when an API fails or is unavailable.
- **Communication Protocol:** Use a standardized message-passing structure. Define a clear schema for `chrome.runtime.sendMessage` to prevent "ghost" messages or unhandled listeners.

## 4. Performance & Resource Management
- **Efficient Background Scripts:** If using Manifest V3, ensure Service Workers are ephemeral. Do not rely on persistent global variables; use `chrome.storage` for state persistence.
- **Memory Leak Prevention:** Clean up event listeners and DOM observers (e.g., `MutationObserver`) when they are no longer needed.
- **Minimized Permissions:** Only request the `permissions` and `host_permissions` strictly required for the current feature set. Avoid `*://*/*` unless it is a core requirement.

## 5. Storage & Data Persistence
- **Schema Versioning:** Implement a versioning system for local storage data. If an update changes the data structure, provide a "Migration Runner" that executes once on update.
- **Asynchronous Flow:** Always treat storage operations as asynchronous. Implement loading states for the UI while data is being fetched from `sync` or `local` storage.

## 6. Testing & Deployment Checklist
Before any code is merged or updated:
1. **Regression Check:** Manually verify the top 3 core features of the extension are still functional.
2. **UI Audit:** Check the UI on both Light and Dark mode (if applicable) and across different website layouts.
3. **Storage Integrity:** Verify that existing user settings are preserved after the update.
4. **Console Cleanliness:** Ensure no debug logs (`console.log`) or errors are present in the production build.

---
**Focus Directive:** Stay within the scope of requested tasks. Do not add "fluff," unrequested branding, or experimental features that might compromise the stability of the production environment.