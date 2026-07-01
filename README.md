# Blackjack Signal

Blackjack Signal is an offline-friendly blackjack decision helper. Enter the dealer upcard, your cards, table rules, and any visible live-shoe cards, and the app recommends the mathematically strongest legal move for the current hand.

It can recommend when to hit, stand, double, split, surrender, or treat the hand as blackjack. It also explains the table rules, warns about weak games, tracks seen cards in live-shoe mode, estimates bonus value, gives bankroll guidance, and includes a practice trainer.

> **Important**
> Blackjack Signal is a decision-support tool, not a guarantee of profit. Blackjack is gambling, and many games have negative expected value even when played well.

## Features

- Basic-strategy and expected-value recommendations
- Live-shoe, RNG, and continuous-shuffler modes
- Seen-card tracker with Hi-Lo running count and estimated true count
- Dealer bust, win, push, and loss estimates
- Ranked comparison of legal actions
- Table-rule profiler and bad-game warnings
- Bankroll guidance based on edge and risk level
- Bonus wagering calculator
- Practice trainer
- EV decision history stored locally in the browser
- Plain HTML, CSS, and JavaScript with no front-end framework
- Optional macOS `.app` build for double-click offline use

## Quick Start

### Prerequisites

- macOS, Windows, or Linux for the web app
- Node.js and npm for local development, testing, and builds
- macOS if you want to build or run the packaged `.app`

### Run from source

Clone or download the repository, then open a terminal in the project root.

```bash
npm install
npm start
```

Then open:

```text
http://localhost:4173
```

### Run tests

```bash
npm test
```

### Build the offline macOS app

```bash
npm run build
```

The generated app and zip files are written to:

```text
outputs/
```

## Using the Packaged macOS App

After building, open:

```text
outputs/Blackjack Signal.app
```

If macOS blocks the app, right-click it once and choose **Open**.

The app opens locally and does not require Terminal after it has been built.

## Project Structure

```text
.
├── README.md
├── package.json
├── index.html
├── styles.css
├── app.js
├── blackjack-engine.js
├── service-worker.js
├── manifest.webmanifest
├── icon.svg
├── scripts/
│   └── build-macos-app.sh
├── tests/
│   └── blackjack-engine.test.js
└── outputs/
    ├── Blackjack Signal.app
    ├── Blackjack Signal Offline.zip
    ├── Blackjack Signal Source Code.zip
    └── README_OFFLINE_APP.md
```

The `outputs/` folder contains generated files. You can rebuild them from the source files at any time.

## How the App Works

The app is built around one question:

> Given the cards and table rules currently known, which legal move has the highest expected value?

Every time you add or remove a card, Blackjack Signal recalculates the hand and updates the recommendation.

The result includes:

- best move
- expected value
- dealer bust chance
- estimated win, push, and loss rates
- remaining cards in the shoe
- running count and true count in live-shoe mode
- ranked list of legal actions
- table-quality warnings

## Game Modes

### RNG

Use **RNG** for online instant blackjack or digital blackjack games where the deck is effectively reshuffled every hand.

In this mode, previous hands do not help predict future cards, so the app focuses on the current hand and table rules.

### CSM

Use **CSM** for continuous-shuffling-machine games or live-style games where cards are quickly recycled.

Card counting usually has little or no value in this mode.

### Live Shoe

Use **Live Shoe** when cards are dealt from a real shoe and remain out until the shuffle.

This is the only mode where seen-card tracking can meaningfully help. The app removes visible cards from the remaining shoe, tracks the Hi-Lo running count, and estimates the true count.

## Basic Use

1. Choose the game mode: **Live Shoe**, **RNG**, or **CSM**.
2. Enter the dealer's visible card.
3. Enter your cards.
4. Review the recommended action.
5. If you hit, add the new card and let the app recalculate.
6. Click **New hand** when the round is over.

In live-shoe mode, the seen-card tracker is not automatically cleared when starting a new hand, because previously exposed cards may still matter until the shoe is shuffled.

## Seen-Card Tracker

Use the seen-card tracker only when exposed cards stay out of the shoe.

Good candidates include:

- other players' visible cards
- dealer cards revealed after the hand
- exposed burn cards, when visible
- your own cards from previous hands in the same shoe

Do not rely on seen-card tracking for RNG or CSM games.

## Table Rules

Open the settings panel to adjust table rules. The app supports:

- number of decks
- blackjack payout
- dealer hits or stands on soft 17
- late surrender
- double after split
- dealer peek
- no-hole-card rules
- double-down restrictions
- split aces
- resplit aces
- side-bet warnings
- fast model or exact finite-shoe audit mode

Rules matter. A weak table can cost more than small differences between close hand decisions.

### Better Rules to Look For

- Blackjack pays 3:2
- Dealer stands on soft 17
- Late surrender is available
- Double on any two cards
- Double after split
- Resplit aces
- Fewer decks, when other rules are similar

### Rules to Be Careful With

- 6:5 blackjack
- Dealer hits soft 17
- No surrender
- No double after split
- Double only on 10 or 11
- No-hole-card rules
- Side bets
- Continuous shuffling when trying to track cards

## Calculation Modes

### Fast Live Model

The fast model is designed for real-time use during a hand. It compares decisions quickly using the current shoe composition and probability estimates.

### Exact Finite Audit

The exact audit model removes every simulated future card from the shoe. It can be more detailed late in a shoe, but it may be slower, especially for split-hand analysis.

Use it for study or review rather than fast table-side decisions.

## Main Source Files

### `index.html`

Defines the page structure, including the dealer section, player hand section, decision card, probability panels, table profiler, seen-card tracker, bankroll calculator, bonus calculator, practice trainer, and settings modal.

It loads the JavaScript files in this order:

```html
<script src="blackjack-engine.js"></script>
<script src="app.js"></script>
```

The engine must load first because `app.js` calls into it.

### `styles.css`

Controls the layout, colors, cards, buttons, modals, responsive behavior, panels, charts, and warning states.

### `blackjack-engine.js`

Contains the blackjack math engine. It handles card normalization, hand totals, soft aces, blackjack detection, shoe counts, dealer outcome distributions, action comparison, table scoring, insurance EV, bankroll advice, bonus EV, and practice-hand generation.

The engine is written so it can run in both the browser and Node.js tests.

### `app.js`

Controls the user interface. It manages hand state, settings state, button clicks, keyboard shortcuts, result rendering, EV history, practice trainer flow, and bankroll and bonus tools.

It calls:

```js
BlackjackEngine.analyze(...)
```

whenever the hand or rules change.

### `service-worker.js`

Helps the app work offline when served from a local server or hosted site. The packaged macOS app opens local files directly and does not depend on the service worker.

### `scripts/build-macos-app.sh`

Creates the offline macOS app bundle. The script builds the `.app` folder structure, writes `Info.plist`, writes the launcher script, copies the web files into the app bundle, validates the app metadata, and creates the offline zip.

## Building the macOS App

From the project root:

```bash
npm test
npm run build
```

After the build, check:

```text
outputs/
```

You should see files such as:

```text
Blackjack Signal.app
Blackjack Signal Offline.zip
README_OFFLINE_APP.md
```

## What the `.app` Contains

On macOS, a `.app` is a folder with a special layout:

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

The launcher opens `Contents/Resources/app/index.html` in the default browser, which lets the app run offline.

## Editing the App

Edit the source files in the project root, not the generated files inside `outputs/Blackjack Signal.app`.

Common files to edit:

```text
index.html
styles.css
app.js
blackjack-engine.js
service-worker.js
```

After editing, rebuild the packaged app:

```bash
npm run build
```

## Publishing on GitHub

For a clean GitHub repository, commit the source files and build script. Generated files in `outputs/` can either be committed for convenience or excluded and attached to a GitHub Release instead.

A typical release workflow is:

1. Commit the source code.
2. Run tests.
3. Build the offline app.
4. Create a GitHub Release such as `v1.0.0`.
5. Upload `outputs/Blackjack Signal Offline.zip` as the release asset.

## Troubleshooting

### `fatal: not a git repository`

You are probably outside the project folder or have not initialized Git yet.

```bash
git init
```

### GitHub asks for a password

GitHub no longer accepts normal account passwords for Git pushes over HTTPS. Use GitHub Desktop, GitHub CLI, a personal access token, or SSH keys.

### macOS says the app cannot be opened

Right-click `Blackjack Signal.app` and choose **Open**. This usually only needs to be done once.

### The app opens but looks old

For the local server:

- hard-refresh the browser
- try `http://localhost:4173/?v=latest`
- stop and restart `npm start`

For the packaged app:

- rebuild with `npm run build`
- open the newly generated app in `outputs/`

### I edited the `.app` but my source did not change

The `.app` is generated output. Edit the root source files, then rebuild.

## Responsible Use

Blackjack Signal gives probability-based guidance. It cannot guarantee a win.

Good blackjack play means choosing better rules, avoiding side bets, avoiding 6:5 blackjack, not chasing losses, keeping bets within your bankroll, and knowing when not to play.

Use the app as a decision tool, not as a promise of profit.
