---
description: Follow these steps sequentially to implement the features defined in `new_feature.md`.
---

# Autonomous Workflow: Brand Find AI Implementation

Follow these steps sequentially to implement the features defined in `new_feature.md`.

## Step 1: Main UI Integration
- Locate the "Base Domains" placeholder section.
- Inject a button labeled "Get AI Domain Idea" below the "Base Domains" label.
- CSS: Ensure full width matching the input field.

## Step 2: Overlay Popup Structure
- Implement an overlay popup triggered by the "Get AI Domain Idea" button.
- UI Requirement: Use existing typography, colors, and design system.
- Interaction: Add a top-right close button. Disable closing via background click.

## Step 3: API & Model State
- Add an API Key input field for Gemini.
- Implement `chrome.storage.local` logic to Save/Retrieve/Remove the key.
- Add a Model Selection dropdown with "Gemma 4" (default) and "Gemini".
- Map "Gemma 4" to `gemma-4-31b-it` and "Gemini" to `gemini-flash-latest`.

## Step 4: Prompt Builder UI
- Create inputs for: Total Ideas (Number), Niche Category, Brand Description, and Total Character Length.
- Implement "Flowing Rules" multi-select dropdown with pre-filled options: Memorable, Creative, Easy to pronounce.
- Implement "Style" multi-select dropdown with pre-filled combination options.
- Ensure both dropdowns allow custom user entries.

## Step 5: Affix & Negative Controls
- Add toggles for Prefixes and Suffixes with character length inputs.
- Pre-fill "Negative Instructions" with editable defaults: No Hyphens, No Numbers, No Trademark Conflicts, No Double Letters, No Obscure Spellings.
- Pre-fill the "Action Prompt" as an editable text area.

## Step 6: AI Processing & Logic
- Create a function to collect all inputs and construct a global prompt template.
- Implement the API call to Google AI Studio using the selected model and saved API key.
- Receive the CSV response.

## Step 7: Results & Interaction
- Create a list view to display AI results inside the popup.
- Add a "+" (Append) button next to each result.
- Implement the "Append" logic: On click, add the domain to the "Base Domains" field in the main UI.

## Step 8: Final Persistence
- Ensure API keys and (optionally) generated responses persist in local storage.
