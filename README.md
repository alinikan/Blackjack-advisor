# Blackjack Signal

Blackjack Signal is a blackjack helper app that tells you the mathematically best move for the hand you are playing.

You enter:

- the dealer's visible card
- your cards
- any extra visible cards if you are playing a real live shoe

Then the app tells you whether you should:

- hit
- stand
- double
- split
- surrender
- treat the hand as blackjack

It also explains the table rules, warns you about bad games, tracks seen cards for live-dealer shoes, estimates bonus value, gives bankroll guidance, and includes a practice trainer.

This project includes both:

- the full source code, which you can put on GitHub
- a double-click macOS `.app`, which opens offline without Terminal

Important: this app helps you make better decisions. It does not guarantee profit. Blackjack is still gambling, and most online blackjack games are negative expected value unless the rules or bonus terms are unusually good.

## The Short Version

If you just want to use the app:

1. Open the `outputs` folder.
2. Double-click `Blackjack Signal.app`.
3. If macOS blocks it, right-click it once and choose **Open**.

If you want to run the source code:

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

If you want to rebuild the `.app` from the code:

```bash
npm run build
```

If you want to test the blackjack engine:

```bash
npm test
```

## What Files You Have

The full project folder is:

```text
/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and
```

Inside that folder, the important source files are:

```text
README.md
.gitignore
package.json
index.html
styles.css
app.js
blackjack-engine.js
service-worker.js
manifest.webmanifest
icon.svg
scripts/build-macos-app.sh
tests/blackjack-engine.test.js
```

The generated offline app files are in:

```text
outputs/
```

That folder contains:

```text
outputs/Blackjack Signal.app
outputs/Blackjack Signal Offline.zip
outputs/Blackjack Signal Source Code.zip
outputs/README_OFFLINE_APP.md
```

Here is the difference:

- `index.html`, `styles.css`, `app.js`, and `blackjack-engine.js` are the actual code.
- `outputs/Blackjack Signal.app` is the packaged double-click app.
- `outputs/Blackjack Signal Offline.zip` is the packaged app in a zip file.
- `outputs/Blackjack Signal Source Code.zip` is a portable copy of the source code.
- `scripts/build-macos-app.sh` is the script that creates the `.app` from the source files.

If you only see the `.app`, remember that a `.app` on macOS is actually a special folder. You can right-click it and choose **Show Package Contents**, but for GitHub you should use the project root, not only the `.app`.

## What The App Does

Blackjack Signal is built around one main idea:

> Given the cards and rules I know right now, which move has the highest expected value?

The app does the math every time you enter or remove a card.

It gives you:

- the best move
- expected value for that move
- win / push / loss estimates
- dealer bust chance
- remaining cards in the shoe
- true count in live-shoe mode
- a ranked list of all legal moves
- warning messages for bad rules
- a table quality score

It also has extra tools:

- seen-card tracker
- table rule settings
- bankroll optimizer
- bonus wagering calculator
- practice trainer
- EV decision history

## How To Use The App While Playing

### Step 1: Choose The Game Mode

At the top of the app there are three modes:

```text
Live Shoe
RNG
CSM
```

Pick the one that matches the game you are playing.

If you are not sure, use this:

- Online instant blackjack: choose `RNG`
- Live dealer with a real shoe: choose `Live Shoe`
- Continuous shuffle game: choose `CSM`

The mode matters because card tracking only helps when previous cards stay out of the shoe.

### Step 2: Enter The Dealer Upcard

Click the dealer's visible card.

Example:

If the dealer is showing a 6, click `6`.

### Step 3: Enter Your Cards

Click your first two cards.

Example:

If you have 5 and 6, click:

```text
5
6
```

The app will show your total and immediately calculate the best move.

### Step 4: Follow The Recommendation

The big decision card will say something like:

```text
HIT
STAND
DOUBLE
SPLIT
SURRENDER
```

The decision table below it ranks every legal move by expected value.

Example:

```text
01 DOUBLE     +0.681
02 HIT        +0.341
03 STAND      -0.150
04 SURRENDER  -0.500
```

In that example, `DOUBLE` is best.

### Step 5: If You Hit, Add The New Card

If you hit and receive another card, click that new card.

The app recalculates using the new hand.

### Step 6: Start A New Hand

Click **New hand** when the round is over.

This clears the dealer card and your hand. It does not automatically clear the seen-card tracker, because in a live shoe the old exposed cards may still matter.

## Game Modes Explained

### RNG

RNG means random number generator.

This is the normal online blackjack format where software deals the cards. In most RNG blackjack games, the deck is effectively shuffled every hand.

That means previous hands do not help you predict future cards.

In RNG mode:

- the app ignores previously seen table cards
- true count is not useful
- basic strategy and table rules matter most
- bonus terms can matter a lot

Use RNG mode for:

- online instant blackjack
- digital blackjack
- any game that reshuffles every hand

### CSM

CSM means continuous shuffling machine.

In a CSM game, cards are continuously or frequently shuffled back into the machine. This makes the game behave more like a freshly shuffled game.

In CSM mode:

- card counting is usually not useful
- seen-card tracking has little or no value
- table rules matter more than counting

Use CSM mode for:

- casino tables with continuous shufflers
- live-style games where cards are quickly recycled
- games where the shoe does not develop a meaningful count

### Live Shoe

Live Shoe means cards are dealt from a real shoe and stay out until the shuffle.

This is the only mode where seen-card tracking can meaningfully help.

In Live Shoe mode:

- visible cards are removed from the remaining shoe
- the app tracks a Hi-Lo running count
- the app estimates true count
- the app can use other players' exposed cards

Use Live Shoe mode for:

- live dealer blackjack with a visible shoe
- physical casino shoe games
- any game where discards remain out until the shuffle

## Seen-Card Tracker

The seen-card tracker is optional.

Use it only when you are playing a live shoe where exposed cards stay out until the shuffle.

Examples of cards you can add:

- other players' cards
- dealer cards revealed after the hand
- exposed burn cards, if visible
- your own cards after a hand if you are tracking across the shoe

Do not use seen-card tracking for RNG or CSM games. Those modes do not benefit from previous-card tracking.

## Table Rules

Click the settings button in the top-right corner to adjust table rules.

The app supports:

- number of decks
- blackjack payout
- dealer hits or stands on soft 17
- late surrender
- double after split
- dealer peek
- no-hole-card rule
- double-down restrictions
- split aces
- resplit aces
- side-bet warning
- fast model or exact finite-shoe audit mode

Rules matter a lot. A bad table can hurt you more than small hand-decision differences.

## Good Rules To Look For

Better blackjack tables usually have:

- blackjack pays 3:2
- dealer stands on soft 17
- late surrender
- double on any two cards
- double after split
- resplit aces
- fewer decks, if the other rules are the same

## Bad Rules To Avoid

Be careful with:

- 6:5 blackjack
- dealer hits soft 17
- no surrender
- no double after split
- double only on 10 or 11
- no-hole-card rules
- side bets
- continuous shuffling if you are trying to track cards

The app's table profiler tries to warn you when the rules are weak.

## Fast Model vs Exact Audit Model

The app has two calculation modes:

```text
Fast live model
Exact finite audit
```

### Fast Live Model

This is the default.

It is designed to be quick enough to use during a real hand.

It uses the current shoe composition and probabilities to compare decisions quickly.

Use this while playing.

### Exact Finite Audit

This mode removes every simulated future card from the shoe.

It is more detailed, especially late in a shoe, but can be slower. Split hands in particular can take longer.

Use this when you want to study a hand or audit a decision, not when you need instant table-side speed.

## Bankroll Tool

The bankroll tool gives a bet-size suggestion based on:

- your bankroll
- table minimum
- table maximum
- risk level
- estimated table edge
- true count if live-shoe mode is active

If the game is negative EV, it usually recommends the minimum bet or skipping the game.

This is intentional. Betting bigger in a negative-EV game only increases expected loss.

## Bonus Calculator

Online casino bonuses can look good but still be bad after wagering requirements.

The bonus calculator estimates:

- required wagering
- expected loss from wagering
- estimated bonus EV
- break-even house edge

Example:

If a casino gives a $100 bonus but requires $6,000 of wagering, the expected loss from that wagering may be larger than the bonus.

Always read the actual casino terms.

## Practice Trainer

The practice trainer gives you random hands and asks you to pick the best move.

Use it to get faster before playing live.

It tracks:

- correct answers
- total attempts
- the best move after you answer

## EV Decision History

You can log a decision after the app recommends a move.

This stores:

- your hand
- dealer upcard
- recommended action
- expected value
- mode
- model
- estimated house edge

This is for reviewing decision quality, not for tracking gambling luck.

## How The Code Works

The app is intentionally simple. It does not use React, Vue, Angular, or any build system.

It is made from plain files:

```text
index.html
styles.css
blackjack-engine.js
app.js
```

This makes it:

- easy to read
- easy to test
- easy to run offline
- easy to put on GitHub
- easy to package into a `.app`

### `index.html`

This file is the page structure.

It defines:

- the dealer card section
- the player hand section
- the decision card
- the probability card
- the action comparison table
- the table profiler
- the seen-card tracker
- the bankroll calculator
- the bonus calculator
- the practice trainer
- the settings modal

At the bottom, it loads:

```html
<script src="blackjack-engine.js"></script>
<script src="app.js"></script>
```

The engine must load first because `app.js` uses it.

### `styles.css`

This file controls the design.

It includes:

- colors
- layout
- mobile responsiveness
- cards
- buttons
- modals
- panels
- charts
- warning cards

### `blackjack-engine.js`

This is the math engine.

It handles:

- card normalization
- hand totals
- soft aces
- blackjack detection
- shoe counts
- dealer outcome distributions
- hit / stand / double / split / surrender comparison
- fast model
- exact finite-shoe model
- table scoring
- insurance EV
- bankroll advice
- bonus EV
- practice hand generation

This file is written so it can run in both:

- the browser
- Node.js tests

That is why it starts with a wrapper that exports `BlackjackEngine` in different environments.

### `app.js`

This is the UI controller.

It handles:

- current hand state
- settings state
- button clicks
- keyboard shortcuts
- rendering results
- saving EV history in local storage
- practice trainer flow
- updating bankroll and bonus tools

It calls:

```js
BlackjackEngine.analyze(...)
```

whenever the hand or rules change.

### `service-worker.js`

This helps the app work offline when served from a local server or hosted site.

The macOS `.app` does not need the service worker because it opens local files directly.

### `scripts/build-macos-app.sh`

This script creates the offline macOS app.

It:

1. creates the `.app` folder structure
2. writes `Info.plist`
3. writes the launcher script
4. copies the web files into the app bundle
5. validates the app metadata
6. creates the offline zip

The script is heavily commented so you can learn how the `.app` is made.

## How To Run From Source

Use this when you want to edit the code or test it locally.

### Step 1: Open Terminal

Open the Terminal app.

### Step 2: Go To The Project Folder

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
```

### Step 3: Start The Local Server

```bash
npm start
```

### Step 4: Open The App

Go to:

```text
http://localhost:4173
```

### Step 5: Stop The Server

When you are done, go back to Terminal and press:

```text
Control + C
```

## How To Run Tests

From the project folder:

```bash
npm test
```

The tests check the blackjack engine.

They do not test every visual part of the app, but they do check the important math helpers and decision behavior.

## How To Generate The `.app`

Use this when you want to create or refresh the double-click offline app.

### Step 1: Go To The Project Folder

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
```

### Step 2: Run Tests First

```bash
npm test
```

### Step 3: Build The App

```bash
npm run build
```

This runs:

```bash
sh scripts/build-macos-app.sh
```

### Step 4: Find The Generated Files

After the build, open:

```text
outputs/
```

You should see:

```text
Blackjack Signal.app
Blackjack Signal Offline.zip
README_OFFLINE_APP.md
```

### Step 5: Open The Offline App

Double-click:

```text
Blackjack Signal.app
```

If macOS blocks it, right-click it and choose **Open**.

## What The `.app` Actually Is

On macOS, a `.app` is a folder with a special layout.

This project generates:

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

### `Info.plist`

This tells macOS:

- the app name
- the executable name
- the app identifier
- the version
- that this folder is an application

### `Contents/MacOS/Blackjack Signal`

This is the launcher.

It is a small shell script that opens:

```text
Contents/Resources/app/index.html
```

in your default browser.

### `Contents/Resources/app/`

This contains a copy of the web app source files.

That is why the `.app` can work offline.

## How To Edit The App

Do not edit the generated files inside `outputs/Blackjack Signal.app` first.

Instead, edit the source files in the project root:

```text
index.html
styles.css
app.js
blackjack-engine.js
service-worker.js
```

Then rebuild:

```bash
npm run build
```

That copies the updated source files into the `.app`.

## How To Put The Whole Project On GitHub

You want the whole project folder on GitHub, not just the `.app`.

The folder to upload is:

```text
/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and
```

## GitHub Option 1: Terminal

### Step 1: Go To The Project Folder

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
```

### Step 2: Initialize Git

```bash
git init
```

### Step 3: See What Git Found

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
tests/blackjack-engine.test.js
outputs/Blackjack Signal.app
outputs/Blackjack Signal Offline.zip
```

### Step 4: Add Everything

```bash
git add .
```

### Step 5: Commit Everything

```bash
git commit -m "Initial Blackjack Signal app"
```

### Step 6: Create A GitHub Repo

Go to:

```text
https://github.com/new
```

Use settings like:

- Repository name: `blackjack-signal`
- Visibility: public or private
- Do not add a README
- Do not add a `.gitignore`
- Do not add a license unless you already know which license you want

Click **Create repository**.

### Step 7: Connect Your Local Folder To GitHub

GitHub will show a repo URL like:

```text
https://github.com/YOUR-USERNAME/blackjack-signal.git
```

Run:

```bash
git remote add origin https://github.com/YOUR-USERNAME/blackjack-signal.git
```

Replace `YOUR-USERNAME` with your GitHub username.

### Step 8: Rename Your Branch To Main

```bash
git branch -M main
```

### Step 9: Push To GitHub

```bash
git push -u origin main
```

Now refresh GitHub. Your code should be there.

## GitHub Option 2: GitHub Desktop

If you prefer not to use Terminal:

1. Open GitHub Desktop.
2. Click **File**.
3. Click **Add Local Repository**.
4. Select:

   ```text
   /Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and
   ```

5. If GitHub Desktop says it is not a repo, choose **Create repository**.
6. Commit all files.
7. Click **Publish repository**.
8. Choose public or private.
9. Publish.

## GitHub Option 3: Upload Source Zip

There is a source-code zip here:

```text
outputs/Blackjack Signal Source Code.zip
```

You can unzip it and upload the contents to GitHub.

The Terminal/GitHub Desktop methods are better, but the zip is useful if you want a portable copy.

## Should The `.app` Be In GitHub?

For a personal project, it is okay to commit:

```text
outputs/Blackjack Signal.app
outputs/Blackjack Signal Offline.zip
```

For a cleaner developer-style project, you can:

- commit the source code
- commit the build script
- put `Blackjack Signal Offline.zip` in GitHub Releases
- avoid committing generated output files

Right now the output files are small, so either approach is fine.

## How To Make A GitHub Release For The Offline App

After your repo is on GitHub:

1. Open your GitHub repo.
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

Now people can download the offline app from the Releases page.

## Common Problems

### `fatal: not a git repository`

You are either in the wrong folder or you have not run `git init`.

Fix:

```bash
cd "/Users/alinikan/Documents/Codex/2026-06-13/make-me-a-very-sophisticated-and"
git init
```

### GitHub asks for a password

GitHub does not accept normal account passwords for Git pushes over HTTPS.

Use one of these:

- GitHub Desktop
- GitHub CLI with `gh auth login`
- a personal access token
- SSH keys

The easiest options are GitHub Desktop or GitHub CLI.

### macOS says the app cannot be opened

Right-click `Blackjack Signal.app` and choose **Open**.

This only needs to be done once.

### The app opens but looks old

If you are using the local server:

- hard refresh the browser
- try `http://localhost:4173/?v=latest`
- stop and restart `npm start`

If you are using the `.app`:

- rebuild it with `npm run build`
- open the newly generated app in `outputs/`

### I edited the `.app` but GitHub does not show my source changes

Edit the root source files instead:

```text
index.html
styles.css
app.js
blackjack-engine.js
```

Then rebuild the `.app`.

## Responsible Use

This app gives probability-based guidance. It cannot guarantee a win.

Good blackjack play means:

- choosing better rules
- avoiding side bets
- avoiding 6:5 blackjack
- not chasing losses
- keeping bets within your bankroll
- knowing when not to play

Use the app as a decision tool, not as a promise of profit.
