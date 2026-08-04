# SL Chrome Extension

A small Chrome extension for jumping between SquadLocker environments. Enter a
locker or order ID and open it in DEV, QA, PROD, or LOCAL — from the popup, a
right-click menu, or a keyboard shortcut.

Now on **Manifest V3**, so it runs on current Chrome and Edge. (Chrome fully
disabled Manifest V2 extensions during 2024–2025, so the previous version no
longer loads at all.)

---

## Installing (for coworkers)

You need the zip from `dist/` — either grab it from the repo's Releases page or
build it yourself (see [Building a release](#building-a-release)).

Chrome does not let an extension install by double-clicking a file unless it
comes from the Chrome Web Store, so it's a one-time drag-and-drop:

1. Unzip the file somewhere you'll keep it — **don't delete the folder
   afterwards**, Chrome loads the extension from it every startup.
   A path with no spaces in it is safest.
2. Go to `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the unzipped folder.

The SquadLocker "S" icon should appear in the toolbar. Pin it for easy access.

> **Why still "Developer mode"?** Chrome only allows one-click, self-updating
> installs for extensions hosted on the Chrome Web Store. See
> [Distribution options](#distribution-options) for how to remove this step.

### Updating

Replace the folder's contents with the new zip's contents, then hit the reload
icon on the extension's card in `chrome://extensions`.

---

## Using it

### Popup

Click the toolbar icon. Enter a **locker ID** or **order ID**, then click the
environment you want. The record opens in a new background tab next to the
current one. Pressing <kbd>Enter</kbd> in a field is a shortcut for **Dev**.

### Recent items

Anything you launch from the popup is remembered, so you can reopen it without
pasting the ID again. Each row carries a colour-coded chip showing the
environment it was launched in:

| Chip | Environment |
| --- | --- |
| green `DEV` | DEV |
| amber `QA` | QA |
| red `PROD` | PROD — red so production is obvious at a glance |
| grey `LOCAL` | LOCAL |

**A single click on a row reopens it** in the environment shown on its chip.
<kbd>Tab</kbd> reaches the rows and <kbd>Enter</kbd> or <kbd>Space</kbd>
activates them.

The last 10 launches are kept, newest first, labelled like `Locker: <id>`. A
record counts as distinct per environment, so the same locker opened in DEV and
QA gives you two rows — one click each to jump between them. Relaunching an
existing one moves it back to the top instead of duplicating. The list syncs
with your Chrome profile, and **Clear** empties it. The list stays hidden until
you've launched something.

### Right-click menu

On a `locker-manager-edit` page, right-click anywhere to get:

- **Open in → Dev / QA / Prod / Local** — reopens the current record in another
  environment.
- **Copy record id** — copies the `recordid` out of the URL to your clipboard.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt+Shift+D` (`Cmd+Shift+D` on Mac) | Open current page in DEV |
| `Alt+Shift+Q` (`Cmd+Shift+Q` on Mac) | Open current page in QA |
| `Alt+Shift+P` (`Cmd+Shift+P` on Mac) | Open current page in PROD |
| `Alt+Shift+R` (`Cmd+Shift+R` on Mac) | Copy record ID |

Remap these at `chrome://extensions/shortcuts` if they clash with something.

### Settings

Right-click the icon → **Options**, or open it from `chrome://extensions`.

Set the base URL per environment. **LOCAL is blank by default** — set it (e.g.
`http://localhost:3000`) before using the Local buttons, or they do nothing.
Trailing slashes are stripped automatically. Values sync across any Chrome
where you're signed in.

Defaults:

| Env | URL |
| --- | --- |
| DEV | `https://homefield-client-dev.squadlocker.com` |
| QA | `https://homefield-client-qa.squadlocker.com` |
| PROD | `https://homefield.squadlocker.com` |
| LOCAL | *(blank)* |

---

## Building a release

Requires PowerShell 7 (`pwsh`), which ships with Windows 11.

```powershell
pwsh -File build.ps1
```

This writes `dist/sl-utility-<version>.zip`, containing only the nine files the
extension needs — no `.git`, no build scripts, no stray local files. Bump
`version` in `manifest.json` before cutting a release; the zip is named from it.

To publish: create a GitHub Release and attach the zip, then send coworkers the
link along with the install steps above.

---

## Distribution options

The drag-and-drop step above exists because of how Chrome distributes
extensions. Options, roughly cheapest to most robust:

1. **Zip + Load unpacked** (current setup) — free, immediate, but each person
   does the manual step, must keep the folder, and gets no auto-updates. Chrome
   also nags about developer-mode extensions on some managed profiles.
2. **Chrome Web Store, unlisted** — one-time $5 developer fee. Installs in one
   click and auto-updates, and "unlisted" keeps it out of search so only people
   with the link can install it. Review usually takes a few days. **Best option
   if this is going to more than a handful of people.**
3. **Enterprise policy force-install** — IT pushes it to everyone via
   `ExtensionInstallForcelist`, no user action at all. Needs an admin and a
   hosted `.crx` + update manifest. Worth asking IT about if this should be
   standard tooling for the team.

A `.crx` emailed around is *not* a shortcut — Chrome blocks installing those
from outside the Web Store, so it fails more confusingly than the zip does.

---

## What changed in the MV3 migration

Behavioral note first: **the "recent launches" dropdown was rebuilt.** In v1 the
UI for it was commented out in `popup.html`/`popup.js`, so nothing ever read the
data back, and the storage format was broken — entries were keyed by the URL's
last segment with `url.split('/')[1]` as the label, which is always the empty
string between the two slashes in `https://host/page/id`. Every dropdown entry
would have been blank.

It now stores a proper list of `{id, pageUrl, env, launchedAt}` records and is
[documented above](#recent-items). Recording happens when the tab is created
rather than 5 seconds later via `setTimeout` + a page-title check, since an
idle service worker gets killed long before such a timer fires. Upgrades from
v1 reset the old object-shaped value to an empty list.

The recent list is a stack of `<button>` rows rather than a `<select>`. That is
deliberate: browsers strip author styling from `<option>` elements, so the
environment chips cannot be rendered inside a native dropdown. Using real
buttons (instead of `div`s with ARIA) means focus, <kbd>Tab</kbd> order, and
<kbd>Enter</kbd>/<kbd>Space</kbd> activation come from the platform rather than
from hand-written key handlers.

Because a row opens in its own recorded environment on click, entries stored
before `env` was tracked have nowhere to open and are filtered out of the list
rather than rendered as dead rows. They age off within 10 launches.

**Manifest**

- `manifest_version` 2 → 3.
- Removed `//` comments — those made the file invalid JSON, and MV3 rejects it.
- `browser_action` → `action`.
- Persistent background page → `background.service_worker`.
- Site access moved from `permissions` into `host_permissions` (MV3 split
  these), scoped to `*://*.squadlocker.com/*` rather than implicit broad access.
- Added `scripting` (needed for clipboard, see below); dropped `clipboardRead`,
  which was never used.
- Dropped the `omnibox` key — it declared a `devcrm` keyword with no handler
  behind it, so typing it did nothing.
- Declared icons at 16/32/48/128 so the toolbar and extensions page aren't
  upscaling a single 16px image.
- Added `minimum_chrome_version` so older browsers give a clear message rather
  than a vague failure.
- Renamed to "SquadLocker Utility" with a real description, and version 1.0 →
  2.0.0.

**Background script → service worker**

- Service workers have no DOM, so the old clipboard approach
  (`document.execCommand('copy')` on an injected `<input>`) could not work. It
  now injects into the active tab via `chrome.scripting.executeScript`, using
  `navigator.clipboard.writeText()` with a `textarea` fallback for when the
  page isn't focused.
- Context menus were created at the top level of the old always-running script.
  A service worker re-runs on every wake, which would throw duplicate-ID
  errors, so menu creation moved into `onInstalled`.
- Callback-style `chrome.*` calls rewritten as `async`/`await` promises, which
  are safer against the worker being suspended mid-callback.
- `onInstalled` now *merges* default URLs over saved ones instead of
  overwriting, so an update no longer wipes custom settings — the old code
  reset every URL on every install.
- Hash parsing uses `URLSearchParams` instead of a hand-rolled split loop.

**Popup**

- `chrome.extension.getBackgroundPage()` no longer exists in MV3; the popup now
  uses `chrome.runtime.sendMessage` and the worker has an `onMessage` handler.
- Fixed selectors that used invalid `>*` syntax and never matched the markup.
- Buttons are `type="button"` and call `preventDefault()` — previously they
  submitted the form and reloaded the popup instead of acting.
- Walking up three `parentElement`s to find the input replaced with
  `closest('.open-with-id')`.
- Blank input is now ignored (it used to open a broken URL), and
  <kbd>Enter</kbd> submits.

**Options page**

- Fixed a real bug: the save callback was attached as a second argument to
  `addEventListener` rather than to `storage.set`, and referenced an element
  (`localEnvironment`) that doesn't exist — so it threw on every save.
- No longer crashes on a fresh profile where `envPaths` is unset.
- Trailing slashes stripped on save; added a "Saved." confirmation, real
  `label`/`for` pairing, and placeholder examples.
- Inline `<style>` moved to `options.css`.

**HTML**

- Added `<!DOCTYPE html>`, `<html lang>`, and `<meta charset>` to both pages.
- Fixed `<h2>` closed with `</h4>`, and a `<script>` sitting outside `<body>`.
- Removed the large commented-out blocks.

**Repo**

- Added `build.ps1` and a `.gitignore` for build output.
- `img.png`, `sqd.svg`, `sqd (1).jpg`, and `chromey.zip` are unused leftovers.
  They're excluded from the packaged zip by `build.ps1`'s explicit file list,
  so they never ship; delete them from the repo whenever convenient.

---

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest |
| `background.js` | Service worker: menus, shortcuts, tab opening, clipboard |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup |
| `options.html` / `options.js` / `options.css` | Environment URL settings |
| `SL.png` | Icon |
| `build.ps1` | Packages `dist/sl-utility-<version>.zip` |

## Troubleshooting

**Local buttons do nothing** — LOCAL has no default. Set it in Options.

**Shortcuts don't fire** — another extension probably claimed them. Check
`chrome://extensions/shortcuts`.

**"Open in" missing from right-click menu** — it only appears on
`locker-manager-edit` pages.

**Extension disappeared after restart** — the folder you loaded it from was
moved or deleted. Chrome reads it from that path every launch.

**Something's broken** — open `chrome://extensions`, find the card, and click
**service worker** to see its console. Errors show up there, not in the page
console.
