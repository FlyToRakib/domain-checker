🚀 New Feature Plan
1) Core Feature
Brand Find by AI
2) UI Addition – AI Button
Add a new button: “Get AI Domain Idea”
Placement:
At the top of the Base Domains placeholder section
Positioned below the text:

“Base Domains (line break or comma-separated)”
Button style:
Full width
Same width as the placeholder input field
3) Popup Behavior (Overlay UI)
On button click → open an overlay popup
Popup requirements:
Must follow existing UI consistency:
Colors
Typography
Overall design system
Include a top-right close button
Important behavior:
❗ Popup must NOT close when clicking outside
Only closes when user explicitly clicks the close button
4) API & Model Setup (Inside Popup)
API Key Input
Field to input Gemini API key
Storage:
Save in Chrome local storage
User controls:
Can add / change / remove API key anytime
Model Selection Dropdown
Dropdown options:
Gemma
Gemini
Backend models (hardcoded in code):
Gemma → gemma-4-31b-it
Gemini → gemini-flash-latest
UI labels:
Show as:
“Gemma 4”
“Gemini”
Default selection:
✅ Gemma selected by default
Note:
Both models use same API (Google AI Studio)
5) User Input Fields (Prompt Builder)
These fields will be used to dynamically generate the final AI prompt:
Required Inputs
Total Domain Name Idea
{value} → Number of domain names to generate
Niche Category
Brand Description
Placeholder:
[INSERT YOUR NICHE/BRAND DESCRIPTION HERE]
Total Character Length
Flowing Rules (Dropdown – Multi Select)
Pre-added options (default selected):
Memorable
Creative
Easy to pronounce (pass the radio test)
Features:
Multi-select enabled
User can add custom rules
Style (Dropdown – Multi Select)
Pre-added options (default selected):
Seamless combinations of two short, relevant words
Combination of word meaning
Combination of two words
Relevant words translated into a foreign language but spelled with the English alphabet
Features:
Multi-select enabled
User can add custom styles
6) Prefix & Suffix Controls
Prefixes
Toggle: Enable / Disable
User can define:
Total character length
Examples:
go, my, up
Suffixes
Toggle: Enable / Disable
User can define:
Total character length
Examples:
ly, sy, co
7) Negative Instructions (Pre-filled, Editable)
Default content:

No Hyphens
No Numbers
No Trademark Conflicts
No Double Letters
No Obscure Spellings
Descriptions:

Hyphens → spammy and forgettable
Numbers → confusing (e.g., “5” vs “five”)
Trademark → avoid similarity with existing brands
Double letters → awkward combinations
Obscure spelling → avoid unnecessary letter changes
8) Action Prompt (Editable, Pre-filled)
Default text:

Please output ONLY the comma separated value (ex: degird, dormfy, wpinlean) of names without any extra descriptions, so I can easily copy them for bulk availability checking.
9) Generate Button (Inside Popup)
Button label: “Get Domain Idea”
10) AI Processing Flow
When user clicks the button:

Collect all user inputs
Generate a well-structured final prompt
Combine:
User inputs
Rules
Styles
Constraints
Follow a global template structure
Ensure best logical sequence for optimal AI output
Send the final prompt to:
Selected model (Gemma / Gemini)
Receive AI response
11) Response Display & Interaction
Show results in popup UI
Format:
Row / list view
Each result includes:
➕ Append button (right side)
Append Action:
On click:
Selected domain is added to:
→ Base Domains placeholder field
12) Local Storage Handling
Save:
API key
Generated responses (optional persistence if needed)
User can:
Modify anytime
Clear anytime