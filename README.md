# Blackjack Signal

Blackjack Signal is a fast, offline-capable blackjack decision assistant. It asks for the dealer upcard and your cards, then recommends the highest expected-value action: hit, stand, double, split, surrender, or blackjack.

It also includes table-quality scoring, RNG / CSM / live-shoe modes, bankroll guidance, bonus EV math, practice drills, EV logging, and a macOS double-click offline launcher.

> Important: this app improves decision quality. It does not guarantee profit. Online RNG blackjack is usually negative expected value unless rules or bonus terms create a real edge.

## If You Only See The `.app`

The `.app` file is the packaged offline version. The full source code is **not inside the visible top level of the `.app`** when you look at it like a normal app.

The complete GitHub-ready source code is in the project root:

```text
/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and
```

The most important source files are:

```text
index.html
styles.css
app.js
blackjack-engine.js
service-worker.js
manifest.webmanifest
icon.svg
package.json
tests/blackjack-engine.test.js
scripts/build-macos-app.sh
README.md
.gitignore
```

The generated app is here:

```text
outputs/Blackjack Signal.app
```

The generated portable zip is here:

```text
outputs/Blackjack Signal Offline.zip
```

The source-code zip for GitHub upload/backup is here:

```text
outputs/Blackjack Signal Source Code.zip
```

Think of it this way:

- The project root is the **source code repo**.
- `outputs/Blackjack Signal.app` is the **built offline app**.
- `scripts/build-macos-app.sh` is the **recipe that creates the `.app` from the source code**.
- `outputs/Blackjack Signal Source Code.zip` is a portable copy of the source-code repo.

## What The App Does

- Recommends the best blackjack move using expected value.
- Ranks every legal action.
- Shows win / push / loss probabilities.
- Supports live shoe, RNG, and CSM modes.
- Tracks seen cards for live-shoe games.
- Shows true count in live-shoe mode.
- Scores table rules and warns about bad games.
- Flags 6:5 blackjack, H17, no surrender, restricted double, no-hole-card rules, and side bets.
- Includes an insurance EV warning.
- Includes bankroll bet-sizing guidance.
- Includes bonus / wagering EV calculator.
- Includes practice trainer and EV decision history.
- Runs as a normal browser app or as an offline macOS launcher.

## Quick Start: Offline App

Use the packaged app if you just want to double-click and play.

1. Open this folder:

   ```text
   /Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and/outputs
   ```

2. Double-click:

   ```text
   Blackjack Signal.app
   ```

3. The app opens in your default browser from local files.

No server, internet, terminal, or `npm start` is required.

### If macOS Blocks It

Because this app was made locally and is not notarized by Apple, macOS may warn you the first time.

Do this once:

1. Right-click `Blackjack Signal.app`.
2. Click **Open**.
3. Confirm **Open** again if macOS asks.

After that, double-clicking should work normally.

### Portable Zip

There is also a zip version:

```text
outputs/Blackjack Signal Offline.zip
```

Use this if you want to move the offline app to another folder or another Mac.

## Run From Source

If you want to run the source version in a local browser server:

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

This is useful for development because it uses the files directly from the project root.

You can also open `index.html` directly in a browser, but the local server is better for testing the service worker and browser caching behavior.

## Run Tests

```bash
npm test
```

The tests check blackjack hand logic, core decisions, exact finite-shoe audit mode, table scoring, RNG/live behavior, bankroll advice, and bonus EV math.

## Game Modes

### RNG

RNG means random number generator. This is the normal instant online blackjack format where software deals the cards.

In most RNG blackjack, each hand is effectively freshly shuffled. Previous hands do not help you predict the next hand. In RNG mode, the app ignores seen cards from previous hands and focuses on perfect strategy, table rules, and risk discipline.

Best use:

- Online instant blackjack.
- Any game that reshuffles every hand.
- Games where you cannot observe a persistent shoe.

### CSM

CSM means continuous shuffling machine. Cards are continuously or frequently shuffled back into the shoe.

Counting is usually not useful in CSM games because the shoe does not develop a stable high-card or low-card bias. Treat this similarly to RNG from a strategy perspective.

Best use:

- Live or physical games using continuous shuffling.
- Games where discards are quickly recycled.

### Live Shoe

Live shoe means a real dealer deals from a physical shoe, usually 6 or 8 decks, and dealt cards stay out until the shuffle.

This is the only mode where seen-card tracking and true count can matter. If many low cards have already come out, the remaining shoe can become richer in tens and aces.

Best use:

- Live-dealer blackjack with a visible shoe.
- In-person shoe games.
- Any game where dealt cards remain out until the shuffle.

## How To Use During A Hand

1. Select the dealer's upcard.
2. Select your first two cards.
3. Read the recommended action.
4. If you hit, add the new card to your hand.
5. The app recalculates immediately.
6. For live-shoe games, optionally add other exposed table cards to the seen-card tracker.

The large decision card shows the best move. The decision table below it ranks every legal option by expected value.

## Table Rules To Prefer

Look for:

- Blackjack pays 3:2.
- Dealer stands on soft 17.
- Late surrender available.
- Double after split allowed.
- Double on any two cards.
- Resplit aces allowed.
- Fewer decks if all other rules are equal.

Avoid or be cautious with:

- 6:5 blackjack.
- Dealer hits soft 17.
- No surrender.
- No double after split.
- Double restricted to 10 or 11 only.
- No-hole-card rules.
- Side bets.
- Continuous shuffle if you are relying on card tracking.

## Project Structure

```text
.
├── .gitignore
├── README.md
├── app.js
├── blackjack-engine.js
├── icon.svg
├── index.html
├── manifest.webmanifest
├── package.json
├── scripts/
│   └── build-macos-app.sh
├── service-worker.js
├── styles.css
├── tests/
│   └── blackjack-engine.test.js
└── outputs/
    ├── Blackjack Signal.app/
    ├── Blackjack Signal Offline.zip
    └── README_OFFLINE_APP.md
```

Important files:

- `index.html`: app markup.
- `styles.css`: visual design and responsive layout.
- `app.js`: UI controller.
- `blackjack-engine.js`: blackjack math, table scoring, bankroll, bonus, and practice logic.
- `scripts/build-macos-app.sh`: step-by-step generator for the offline macOS `.app`.
- `tests/blackjack-engine.test.js`: automated tests.
- `outputs/Blackjack Signal.app`: double-click offline macOS launcher.
- `outputs/Blackjack Signal Offline.zip`: portable offline package.

## How The Code Is Organized

### `index.html`

This file defines the page structure:

- dealer upcard selector
- player hand selector
- decision panel
- probabilities
- action comparison table
- table profiler
- seen-card tracker
- bankroll calculator
- bonus calculator
- practice trainer
- settings modal

It loads the app in this order:

```html
<script src="blackjack-engine.js"></script>
<script src="app.js"></script>
```

The engine loads first because `app.js` calls `BlackjackEngine.analyze(...)`.

### `styles.css`

This file contains all visual styling:

- desktop layout
- mobile layout
- cards
- decision panels
- modal
- profiler
- calculators
- practice section

No CSS framework is used. That keeps the project portable and easy to host.

### `blackjack-engine.js`

This is the math layer. It does not know about buttons or the page. It only receives data and returns analysis.

Main responsibilities:

- normalize card ranks
- calculate hard/soft hand totals
- remove visible cards from the shoe
- calculate dealer outcome distributions
- compare hit, stand, double, split, and surrender
- support fast mode and exact finite-shoe audit mode
- score table rules
- calculate insurance EV
- estimate bankroll bet sizing
- estimate bonus/wagering EV
- generate practice hands

This file has detailed comments explaining the engine structure, fast vs exact models, shoe math, and rule scoring.

### `app.js`

This is the browser UI controller.

Main responsibilities:

- store the current hand and settings
- listen for clicks and keyboard input
- call `BlackjackEngine.analyze(...)`
- render the recommendation
- render probabilities and action rankings
- manage settings
- manage seen cards
- log EV decisions
- run practice mode
- update bankroll and bonus tools

This file has comments explaining the state object, render pipeline, event binding, and local-only history.

### `service-worker.js`

This file enables offline caching when the app is served over `http://localhost` or hosted on a static website.

The macOS `.app` does not depend on the service worker because it opens local files directly.

### `scripts/build-macos-app.sh`

This is the build script that creates:

```text
outputs/Blackjack Signal.app
outputs/Blackjack Signal Offline.zip
```

It is heavily commented so you can see exactly how the `.app` is generated.

## How To Generate The `.app` From Start To Finish

These steps rebuild the offline app from the source files.

### Step 1: Open Terminal

Open the Terminal app on your Mac.

### Step 2: Go To The Project Folder

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
```

### Step 3: Confirm The Source Files Exist

```bash
ls
```

You should see files like:

```text
README.md
index.html
styles.css
app.js
blackjack-engine.js
package.json
scripts
tests
outputs
```

### Step 4: Run Tests Before Building

```bash
npm test
```

This confirms the blackjack engine still behaves correctly.

### Step 5: Build The Offline App

Use either command:

```bash
npm run build
```

or:

```bash
sh scripts/build-macos-app.sh
```

Both commands run the same build script.

### Step 6: What The Build Script Does

The script:

1. Deletes the old generated `.app` and zip.
2. Creates this macOS app folder structure:

   ```text
   outputs/Blackjack Signal.app/
   └── Contents/
       ├── Info.plist
       ├── MacOS/
       │   └── Blackjack Signal
       └── Resources/
           └── app/
               ├── index.html
               ├── styles.css
               ├── blackjack-engine.js
               ├── app.js
               ├── manifest.webmanifest
               ├── icon.svg
               └── service-worker.js
   ```

3. Writes `Info.plist`, which tells macOS this folder is an app.
4. Writes the launcher file:

   ```text
   Contents/MacOS/Blackjack Signal
   ```

5. Makes the launcher executable.
6. Copies the web app files into:

   ```text
   Contents/Resources/app/
   ```

7. Validates `Info.plist`.
8. Creates:

   ```text
   outputs/Blackjack Signal Offline.zip
   ```

### Step 7: Start The Offline App

After building, open:

```text
outputs
```

Then double-click:

```text
Blackjack Signal.app
```

The launcher opens:

```text
outputs/Blackjack Signal.app/Contents/Resources/app/index.html
```

in your default browser.

### Step 8: If macOS Blocks The App

Right-click `Blackjack Signal.app`, choose **Open**, then confirm.

This happens because the app is locally generated and not Apple-notarized.

## How To Start It In Each Mode

### Offline Double-Click Mode

Use:

```text
outputs/Blackjack Signal.app
```

Best for normal use.

### Development Server Mode

Use:

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

Best for editing and testing source code.

### Direct Browser File Mode

You can also open:

```text
index.html
```

directly in a browser.

The `.app` uses this approach internally, but packaged in a cleaner double-click wrapper.

## How To Edit The Code And Rebuild

Typical workflow:

1. Edit source files:

   ```text
   index.html
   styles.css
   app.js
   blackjack-engine.js
   ```

2. Test:

   ```bash
   npm test
   ```

3. Run locally:

   ```bash
   npm start
   ```

4. Rebuild the `.app`:

   ```bash
   npm run build
   ```

5. Double-click the new:

   ```text
   outputs/Blackjack Signal.app
   ```

6. Commit changes:

   ```bash
   git add .
   git commit -m "Update Blackjack Signal"
   git push
   ```

## How To Put This Folder On GitHub

You have two good options:

- Use the GitHub website and GitHub Desktop.
- Use terminal commands with Git.

The terminal method is more precise and works well for this project.

## GitHub Method 1: Terminal

### Step 1: Open Terminal In The Project Folder

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
```

### Step 2: Initialize Git

```bash
git init
```

### Step 3: Check What Will Be Added

```bash
git status
```

You should see files like:

```text
README.md
index.html
styles.css
app.js
blackjack-engine.js
scripts/build-macos-app.sh
outputs/Blackjack Signal.app
outputs/Blackjack Signal Offline.zip
tests/blackjack-engine.test.js
```

### Step 4: Add The Files

```bash
git add .
```

### Step 5: Commit The Files

```bash
git commit -m "Initial Blackjack Signal app"
```

### Step 6: Create An Empty GitHub Repo

Go to:

```text
https://github.com/new
```

Recommended settings:

- Repository name: `blackjack-signal`
- Visibility: private or public, your choice
- Do not add a README on GitHub, because this folder already has one.
- Do not add `.gitignore` on GitHub, because this folder already has one.
- Do not add a license unless you know which license you want.

Click **Create repository**.

### Step 7: Connect Your Local Folder To GitHub

GitHub will show a URL like:

```text
https://github.com/YOUR-USERNAME/blackjack-signal.git
```

Run this, replacing the URL with your real GitHub URL:

```bash
git remote add origin https://github.com/YOUR-USERNAME/blackjack-signal.git
```

### Step 8: Rename Your Branch To Main

```bash
git branch -M main
```

### Step 9: Push To GitHub

```bash
git push -u origin main
```

After this, refresh the GitHub page. Your whole project should be there.

## GitHub Method 2: GitHub CLI

If you have the GitHub CLI installed, you can create and push the repo from Terminal:

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
git init
git add .
git commit -m "Initial Blackjack Signal app"
gh repo create blackjack-signal --private --source=. --remote=origin --push
```

Use `--public` instead of `--private` if you want the repo public.

If `gh` asks you to log in:

```bash
gh auth login
```

Then repeat the `gh repo create` command.

## GitHub Method 3: GitHub Desktop

1. Open GitHub Desktop.
2. Choose **File > Add Local Repository**.
3. Select this folder:

   ```text
   /Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and
   ```

4. If GitHub Desktop says it is not a repository, choose **Create a repository**.
5. Commit all files with a message like:

   ```text
   Initial Blackjack Signal app
   ```

6. Click **Publish repository**.
7. Choose public or private.
8. Publish.

## Should You Commit The Offline App Bundle?

This project currently includes:

```text
outputs/Blackjack Signal.app
outputs/Blackjack Signal Offline.zip
```

For a small personal project, committing them is fine.

For a cleaner developer-style repo, you may prefer:

- Commit the source code.
- Commit the README.
- Put the zip in GitHub Releases instead of the main repo.

Since the zip is small right now, either approach is okay.

## Create A GitHub Release For The Offline Zip

After pushing the repo:

1. Go to your GitHub repo page.
2. Click **Releases**.
3. Click **Draft a new release**.
4. Create a tag:

   ```text
   v1.0.0
   ```

5. Release title:

   ```text
   Blackjack Signal v1.0.0
   ```

6. Upload:

   ```text
   outputs/Blackjack Signal Offline.zip
   ```

7. Click **Publish release**.

This gives you a clean download link for the offline app.

## Update The Offline App After Editing Source Files

The offline `.app` contains a copy of the source files. If you edit `index.html`, `styles.css`, `app.js`, or `blackjack-engine.js`, you should refresh the bundled copy.

From the project root:

```bash
npm run build
```

Then commit the updated files:

```bash
git add .
git commit -m "Update offline app build"
git push
```

## Common Git Problems

### Problem: `fatal: not a git repository`

You have not run `git init`, or you are in the wrong folder.

Fix:

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
git init
```

### Problem: GitHub asks for a password

GitHub no longer accepts normal account passwords for Git pushes over HTTPS. Use one of these:

- GitHub Desktop.
- GitHub CLI with `gh auth login`.
- A GitHub personal access token.
- SSH keys.

The easiest path is usually GitHub Desktop or `gh auth login`.

### Problem: macOS blocks the offline app

Right-click the app and choose **Open** once.

### Problem: Browser shows an older version

Try one of these:

- Hard refresh the browser.
- Open the offline `.app` again.
- If running the local server, use `http://localhost:4173/?v=latest`.

## Responsible Use

This is probability software. It does not guarantee wins. Casino games can be risky and addictive. Use limits, avoid chasing losses, and only play where it is legal and allowed by the casino's rules.
