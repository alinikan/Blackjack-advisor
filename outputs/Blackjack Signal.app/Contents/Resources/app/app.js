(function () {
  "use strict";

  /*
   * app.js is the browser controller:
   * - owns the current hand/settings state
   * - listens for taps/keyboard input
   * - calls BlackjackEngine.analyze(...)
   * - renders the decision cards, calculators, practice mode, and history
   *
   * There is no framework here on purpose. Plain JavaScript keeps the app fast,
   * dependency-free, easy to audit, and simple to package into the offline .app.
   */
  const DISPLAY_RANKS = BlackjackEngine.DISPLAY_RANKS;
  const STORAGE_KEY = "blackjack-signal-history-v2";

  /*
   * Single source of truth for the UI. Whenever the user changes a card or rule,
   * we update this object and call render(). That avoids hidden duplicated state.
   */
  const state = {
    dealerUpcard: null,
    playerCards: [],
    seenCards: [],
    rules: {
      mode: "live",
      enginePrecision: "fast",
      decks: 6,
      dealerHitsSoft17: false,
      blackjackPayout: 1.5,
      lateSurrender: true,
      doubleAfterSplit: true,
      dealerPeeked: true,
      noHoleCard: false,
      doublePolicy: "anyTwo",
      splitAces: true,
      resplitAces: false,
      maxSplitHands: 4,
      sideBets: false,
    },
    currentResult: null,
    history: loadHistory(),
    practice: {
      current: null,
      correct: 0,
      total: 0,
    },
  };

  // Small DOM helper. Every element reference below maps to an id in index.html.
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    dealerRanks: $("#dealerRanks"), playerRanks: $("#playerRanks"), seenRanks: $("#seenRanks"),
    dealerSlot: $("#dealerSlot"), playerHand: $("#playerHand"), handTotal: $("#handTotal"),
    undoButton: $("#undoButton"), clearDealerButton: $("#clearDealerButton"), newHandButton: $("#newHandButton"),
    decisionCard: $("#decisionCard"), decisionKicker: $("#decisionKicker"), decisionAction: $("#decisionAction"),
    decisionEv: $("#decisionEv"), decisionReason: $("#decisionReason"), edgeFill: $("#edgeFill"), speedBadge: $("#speedBadge"),
    logDecisionButton: $("#logDecisionButton"),
    winProbability: $("#winProbability"), pushProbability: $("#pushProbability"), lossProbability: $("#lossProbability"),
    winBar: $("#winBar"), pushBar: $("#pushBar"), lossBar: $("#lossBar"), dealerBust: $("#dealerBust"),
    cardsLeft: $("#cardsLeft"), trueCount: $("#trueCount"), actionComparison: $("#actionComparison"),
    trackerToggle: $("#trackerToggle"), trackerBody: $("#trackerBody"), seenList: $("#seenList"), clearSeenButton: $("#clearSeenButton"),
    settingsModal: $("#settingsModal"), settingsButton: $("#settingsButton"), closeSettingsButton: $("#closeSettingsButton"),
    saveSettingsButton: $("#saveSettingsButton"), decksSetting: $("#decksSetting"), payoutSetting: $("#payoutSetting"),
    h17Setting: $("#h17Setting"), surrenderSetting: $("#surrenderSetting"), dasSetting: $("#dasSetting"), peekSetting: $("#peekSetting"),
    noHoleSetting: $("#noHoleSetting"), splitAcesSetting: $("#splitAcesSetting"), resplitAcesSetting: $("#resplitAcesSetting"),
    sideBetsSetting: $("#sideBetsSetting"), modeSetting: $("#modeSetting"), precisionSetting: $("#precisionSetting"),
    doublePolicySetting: $("#doublePolicySetting"), rulesSummary: $("#rulesSummary"), modeSwitch: $("#modeSwitch"),
    engineModel: $("#engineModel"), tableGrade: $("#tableGrade"), tableScore: $("#tableScore"),
    houseEdgeEstimate: $("#houseEdgeEstimate"), tableSummary: $("#tableSummary"), warningList: $("#warningList"),
    bankrollInput: $("#bankrollInput"), minBetInput: $("#minBetInput"), maxBetInput: $("#maxBetInput"), riskSetting: $("#riskSetting"),
    suggestedBet: $("#suggestedBet"), bankrollMessage: $("#bankrollMessage"),
    depositInput: $("#depositInput"), bonusInput: $("#bonusInput"), wagerInput: $("#wagerInput"), contributionInput: $("#contributionInput"),
    bonusEv: $("#bonusEv"), bonusMessage: $("#bonusMessage"),
    newPracticeButton: $("#newPracticeButton"), practiceHand: $("#practiceHand"), practiceActions: $("#practiceActions"),
    practiceFeedback: $("#practiceFeedback"), practiceScore: $("#practiceScore"),
    clearHistoryButton: $("#clearHistoryButton"), historyList: $("#historyList"), historyCount: $("#historyCount"), historyAverage: $("#historyAverage"),
  };

  function loadHistory() {
    // Decision history is local-only. It never leaves the browser.
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history.slice(0, 50)));
  }

  function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function formatEv(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
  }

  function compactRank(rank) {
    return BlackjackEngine.normalizeRank(rank);
  }

  function cardButton(rank, target) {
    // One reusable button builder powers dealer cards, player cards, and seen cards.
    const button = document.createElement("button");
    button.className = `rank-button ${rank === "10" || ["J", "Q", "K"].includes(rank) ? "ten-rank" : ""}`;
    button.type = "button";
    button.dataset.rank = rank;
    button.innerHTML = `<strong>${rank}</strong><small>${["J", "Q", "K"].includes(rank) ? "10" : ""}</small>`;
    button.addEventListener("click", () => addCard(target, rank));
    return button;
  }

  function buildRankGrids() {
    DISPLAY_RANKS.forEach((rank) => {
      elements.dealerRanks.appendChild(cardButton(rank, "dealer"));
      elements.playerRanks.appendChild(cardButton(rank, "player"));
      elements.seenRanks.appendChild(cardButton(rank, "seen"));
    });
  }

  function addCard(target, rank) {
    // Route a selected rank to the right part of state, then redraw everything.
    if (target === "dealer") state.dealerUpcard = rank;
    if (target === "player") state.playerCards.push(rank);
    if (target === "seen") state.seenCards.push(rank);
    render();
  }

  function playingCard(rank, removable, index, source) {
    const red = ["A", "3", "5", "7", "9", "J", "K"].includes(rank);
    return `<button class="playing-card ${red ? "red" : "black"}" ${removable ? `data-remove="${source}" data-index="${index}"` : "disabled"} type="button" aria-label="${removable ? `Remove ${rank}` : rank}">
      <span>${rank}</span><i>${red ? "♦" : "♠"}</i><b>${rank}</b>
    </button>`;
  }

  function renderCards() {
    // Renders the visible dealer slot, player hand, total, undo state, and selection styles.
    if (state.dealerUpcard) {
      elements.dealerSlot.classList.remove("empty");
      elements.dealerSlot.innerHTML = `${playingCard(state.dealerUpcard, false)}<span>Dealer showing <strong>${state.dealerUpcard}</strong></span>`;
    } else {
      elements.dealerSlot.classList.add("empty");
      elements.dealerSlot.innerHTML = `<span class="card-placeholder">?</span><span>Choose the dealer's visible card</span>`;
    }

    if (state.playerCards.length) {
      elements.playerHand.classList.remove("empty");
      elements.playerHand.innerHTML = state.playerCards.map((rank, index) => playingCard(rank, true, index, "player")).join("");
      const hand = BlackjackEngine.handState(state.playerCards);
      elements.handTotal.textContent = hand.bust ? `Bust · ${hand.total}` : hand.blackjack ? "Blackjack · 21" : `${hand.soft ? "Soft " : ""}${hand.total}`;
    } else {
      elements.playerHand.classList.add("empty");
      elements.playerHand.innerHTML = `<div class="empty-hand"><span></span><span></span><p>Add your first two cards</p></div>`;
      elements.handTotal.textContent = "Waiting";
    }
    elements.undoButton.disabled = !state.playerCards.length;

    document.querySelectorAll("[data-remove='player']").forEach((button) => {
      button.addEventListener("click", () => {
        state.playerCards.splice(Number(button.dataset.index), 1);
        render();
      });
    });

    const selectedDealer = state.dealerUpcard ? compactRank(state.dealerUpcard) : null;
    elements.dealerRanks.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("selected", !!selectedDealer && compactRank(button.dataset.rank) === selectedDealer);
    });
  }

  function reasonFor(result) {
    // Human-readable explanation for the best action. The detailed EV ranking
    // remains in the decision table for users who want the numbers.
    const best = result.best;
    const total = result.player.total;
    const dealer = compactRank(state.dealerUpcard);
    if (best.action === "BLACKJACK") return `Natural 21. Expected return includes the table's ${state.rules.blackjackPayout === 1.5 ? "3:2" : "6:5"} payout.`;
    if (best.action === "BUST") return "This hand is over 21. Start a new hand when the dealer resolves the round.";
    if (best.action === "SURRENDER") return `Giving up half the wager loses less on average than playing ${total} against a dealer ${dealer}.`;
    if (best.action === "SPLIT") return `Separating the pair creates more expected value than playing the combined ${total}.`;
    if (best.action === "DOUBLE") return `One card with a doubled wager has the strongest expected return against the dealer ${dealer}.`;
    if (best.action === "HIT") return `${total} needs improvement. Drawing now beats standing by ${formatEv(result.edgeOverNext)} expected units.`;
    return `Holding ${total} protects more value. Standing beats the next-best move by ${formatEv(result.edgeOverNext)} expected units.`;
  }

  function renderWaiting() {
    // Empty/incomplete-hand state. This keeps the app calm before enough cards
    // have been entered to run the engine.
    state.currentResult = null;
    elements.decisionCard.className = "decision-card panel waiting";
    elements.decisionKicker.textContent = state.dealerUpcard ? "Dealer card locked" : "Ready when you are";
    elements.decisionAction.textContent = state.dealerUpcard ? "ADD YOUR HAND" : "ADD CARDS";
    elements.decisionEv.textContent = "—";
    elements.decisionReason.textContent = state.dealerUpcard ? "Add at least two cards to calculate the best available move." : "Choose the dealer upcard and add at least two cards to your hand.";
    elements.edgeFill.style.width = "50%";
    elements.logDecisionButton.disabled = true;
    [elements.winProbability, elements.pushProbability, elements.lossProbability, elements.dealerBust].forEach((el) => { el.textContent = "—"; });
    [elements.winBar, elements.pushBar, elements.lossBar].forEach((el) => { el.style.width = "0%"; });
    elements.actionComparison.innerHTML = `<div class="comparison-empty">Your options will appear here.</div>`;
  }

  function renderAnalysis() {
    // Main live analysis render. This is called after every card/rule change.
    if (!state.dealerUpcard || state.playerCards.length < 2) {
      renderWaiting();
      updateShoeStats();
      return;
    }
    const result = BlackjackEngine.analyze(state);
    state.currentResult = result;
    const best = result.best;
    const actionClass = best.action.toLowerCase();
    elements.decisionCard.className = `decision-card panel ${actionClass}`;
    elements.decisionKicker.textContent = best.action === "BLACKJACK" ? "Premium hand" : `${formatPercent(Math.abs(result.edgeOverNext))} EV gap to next option`;
    elements.decisionAction.textContent = best.action;
    elements.decisionEv.textContent = formatEv(best.ev);
    elements.decisionReason.textContent = reasonFor(result);
    elements.speedBadge.textContent = `${result.elapsedMs < 1 ? "< 1" : result.elapsedMs.toFixed(1)} ms`;
    elements.edgeFill.style.width = `${Math.max(4, Math.min(96, 50 + best.ev * 32))}%`;
    elements.logDecisionButton.disabled = false;
    elements.winProbability.textContent = formatPercent(best.win);
    elements.pushProbability.textContent = formatPercent(best.push);
    elements.lossProbability.textContent = formatPercent(best.loss);
    elements.winBar.style.width = formatPercent(best.win);
    elements.pushBar.style.width = formatPercent(best.push);
    elements.lossBar.style.width = formatPercent(best.loss);
    elements.dealerBust.textContent = formatPercent(result.dealer.bust);
    elements.cardsLeft.textContent = result.cardsLeft;
    elements.trueCount.textContent = `${result.trueCount >= 0 ? "+" : ""}${result.trueCount.toFixed(1)}`;

    elements.actionComparison.innerHTML = result.actions.map((action, index) => `
      <div class="action-row ${index === 0 ? "best" : ""}">
        <span class="action-rank">${String(index + 1).padStart(2, "0")}</span>
        <span class="action-name"><strong>${action.action}</strong>${index === 0 ? "<small>Recommended</small>" : ""}</span>
        <span class="action-bar"><i style="width:${Math.max(3, Math.min(100, (action.ev + 1) * 50))}%"></i></span>
        <strong class="action-ev ${action.ev >= 0 ? "positive" : "negative"}">${formatEv(action.ev)}</strong>
      </div>`).join("");
  }

  function updateShoeStats() {
    // RNG/CSM modes ignore the seen-card tracker by design; live-shoe mode uses it.
    const visible = [...(state.dealerUpcard ? [state.dealerUpcard] : []), ...state.playerCards, ...(state.rules.mode === "live" ? state.seenCards : [])];
    const counts = BlackjackEngine.shoeCounts(state.rules.decks, visible);
    elements.cardsLeft.textContent = Object.values(counts).reduce((a, b) => a + b, 0);
    elements.trueCount.textContent = state.rules.mode === "live" ? "+0.0" : "N/A";
  }

  function renderSeenCards() {
    const trackerNote = elements.trackerToggle.querySelector("small");
    trackerNote.textContent = state.rules.mode === "live"
      ? "Track other exposed live-shoe cards for sharper estimates"
      : "Ignored in RNG/CSM mode because prior cards do not predict the next hand";
    if (!state.seenCards.length) elements.seenList.innerHTML = "<span>No additional cards tracked</span>";
    else {
      const counts = {};
      state.seenCards.forEach((rank) => { counts[rank] = (counts[rank] || 0) + 1; });
      elements.seenList.innerHTML = Object.entries(counts).map(([rank, count]) => `<button type="button" data-seen-rank="${rank}"><strong>${rank}</strong><span>× ${count}</span></button>`).join("");
      elements.seenList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
        const index = state.seenCards.lastIndexOf(button.dataset.seenRank);
        if (index >= 0) state.seenCards.splice(index, 1);
        render();
      }));
    }
  }

  function renderRules() {
    const mode = { live: "Live shoe", rng: "RNG", csm: "CSM" }[state.rules.mode] || "Live shoe";
    const precision = state.rules.enginePrecision === "exact" ? "Exact audit" : "Fast model";
    elements.rulesSummary.textContent = `${mode} · ${state.rules.decks} deck${state.rules.decks > 1 ? "s" : ""} · Dealer ${state.rules.dealerHitsSoft17 ? "hits" : "stands"} soft 17 · ${precision}`;
    elements.modeSwitch.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.rules.mode));
  }

  function renderProfile() {
    // Table profiler explains whether the rules are worth playing before the
    // user even starts worrying about individual hand decisions.
    const result = state.currentResult;
    const table = result ? result.table : BlackjackEngine.profileTable(state.rules);
    elements.engineModel.textContent = result ? result.model : (state.rules.enginePrecision === "exact" ? "Exact audit" : "Fast live");
    elements.tableGrade.textContent = table.grade;
    elements.tableScore.textContent = `${table.score}/100`;
    elements.houseEdgeEstimate.textContent = `${table.houseEdgePercent.toFixed(2)}% house edge`;
    const tableLine = table.grade === "Avoid"
      ? "Avoid this ruleset if you can find a better table."
      : table.grade === "A"
        ? "Strong rules. Your biggest edge is avoiding mistakes and bad promos."
        : "Playable, but look for better rules before increasing stakes.";
    elements.tableSummary.textContent = tableLine;
    const alerts = result ? result.warnings : [];
    const tableWarnings = table.warnings.slice(0, 4).map((body) => ({ tone: "warn", title: "Rule note", body }));
    const list = [...alerts, ...tableWarnings].slice(0, 6);
    if (!list.length) {
      elements.warningList.innerHTML = `<div class="warning-item good"><strong>No major alerts</strong><span>Rules look solid. Keep side bets off.</span></div>`;
      return;
    }
    elements.warningList.innerHTML = list.map((warning) => `
      <div class="warning-item ${warning.tone || "warn"}">
        <strong>${warning.title}</strong>
        <span>${warning.body}</span>
      </div>`).join("");
  }

  function renderBankroll() {
    // Bet sizing is tied to the current table rules and true count estimate.
    const table = state.currentResult ? state.currentResult.table : BlackjackEngine.profileTable(state.rules);
    const advice = BlackjackEngine.bankrollAdvice({
      rules: state.rules,
      table,
      trueCount: state.currentResult ? state.currentResult.trueCount : 0,
      bankroll: elements.bankrollInput.value,
      minBet: elements.minBetInput.value,
      maxBet: elements.maxBetInput.value,
      risk: elements.riskSetting.value,
    });
    elements.suggestedBet.textContent = formatMoney(advice.suggestedBet);
    elements.bankrollMessage.textContent = `${advice.message} Bankroll is ${advice.units.toFixed(1)} table units.`;
  }

  function renderBonus() {
    // Bonus EV is often more important online than tiny strategy differences.
    const table = state.currentResult ? state.currentResult.table : BlackjackEngine.profileTable(state.rules);
    const promo = BlackjackEngine.bonusValue({
      deposit: elements.depositInput.value,
      bonus: elements.bonusInput.value,
      multiplier: elements.wagerInput.value,
      contribution: elements.contributionInput.value,
      houseEdgePercent: table.houseEdgePercent,
    });
    elements.bonusEv.textContent = `${promo.ev >= 0 ? "+" : ""}${formatMoney(promo.ev)}`;
    elements.bonusEv.classList.toggle("positive", promo.ev >= 0);
    elements.bonusEv.classList.toggle("negative", promo.ev < 0);
    elements.bonusMessage.textContent = `${formatMoney(promo.wageringRequired)} wagering creates about ${formatMoney(promo.expectedLoss)} in expected loss. Break-even house edge: ${promo.breakEvenHouseEdgePercent.toFixed(2)}%.`;
  }

  function renderHistory() {
    // Shows recent logged decisions so users can review if they followed EV.
    elements.historyCount.textContent = state.history.length;
    if (!state.history.length) {
      elements.historyAverage.textContent = "—";
      elements.historyList.textContent = "No decisions logged yet.";
      return;
    }
    const average = state.history.reduce((sum, item) => sum + item.ev, 0) / state.history.length;
    elements.historyAverage.textContent = formatEv(average);
    elements.historyList.innerHTML = state.history.slice(0, 8).map((item) => `
      <div class="history-row">
        <span>${item.player.join("-")} vs ${item.dealer}</span>
        <strong>${item.action}</strong>
        <em>${formatEv(item.ev)}</em>
      </div>`).join("");
  }

  function renderPractice() {
    elements.practiceScore.textContent = `${state.practice.correct}/${state.practice.total}`;
    if (!state.practice.current) return;
    const hand = state.practice.current;
    elements.practiceHand.innerHTML = `
      <div><span>Dealer</span>${playingCard(hand.dealerUpcard, false)}</div>
      <div><span>You</span>${hand.playerCards.map((rank) => playingCard(rank, false)).join("")}</div>`;
  }

  function render() {
    // Central render pipeline. Most actions end here.
    renderCards();
    renderSeenCards();
    renderAnalysis();
    renderProfile();
    renderBankroll();
    renderBonus();
    renderHistory();
    renderPractice();
    renderRules();
  }

  function openSettings() {
    elements.modeSetting.value = state.rules.mode;
    elements.precisionSetting.value = state.rules.enginePrecision;
    elements.decksSetting.value = String(state.rules.decks);
    elements.payoutSetting.value = String(state.rules.blackjackPayout);
    elements.doublePolicySetting.value = state.rules.doublePolicy;
    elements.h17Setting.checked = state.rules.dealerHitsSoft17;
    elements.surrenderSetting.checked = state.rules.lateSurrender;
    elements.dasSetting.checked = state.rules.doubleAfterSplit;
    elements.peekSetting.checked = state.rules.dealerPeeked;
    elements.noHoleSetting.checked = state.rules.noHoleCard;
    elements.splitAcesSetting.checked = state.rules.splitAces;
    elements.resplitAcesSetting.checked = state.rules.resplitAces;
    elements.sideBetsSetting.checked = state.rules.sideBets;
    elements.settingsModal.hidden = false;
    requestAnimationFrame(() => elements.settingsModal.classList.add("open"));
  }

  function closeSettings() {
    elements.settingsModal.classList.remove("open");
    setTimeout(() => { elements.settingsModal.hidden = true; }, 180);
  }

  function applyRules(nextRules) {
    // Merge new settings with current settings, then normalize through the engine.
    state.rules = BlackjackEngine.normalizeRules({ ...state.rules, ...nextRules });
    render();
  }

  function logDecision() {
    // Store the recommendation, not the gambling outcome. The goal is tracking
    // decision quality, not short-term luck.
    if (!state.currentResult) return;
    state.history.unshift({
      at: new Date().toISOString(),
      dealer: state.dealerUpcard,
      player: state.playerCards.slice(),
      action: state.currentResult.best.action,
      ev: state.currentResult.best.ev,
      mode: state.rules.mode,
      model: state.currentResult.model,
      houseEdge: state.currentResult.table.houseEdgePercent,
    });
    state.history = state.history.slice(0, 50);
    saveHistory();
    renderHistory();
  }

  function newPracticeDrill() {
    // Practice mode generates a random hand and asks the user to pick the move.
    state.practice.current = BlackjackEngine.generatePracticeHand(state.rules);
    elements.practiceFeedback.innerHTML = `Choose the best move. Accuracy: <strong id="practiceScore">${state.practice.correct}/${state.practice.total}</strong>`;
    elements.practiceScore = $("#practiceScore");
    renderPractice();
  }

  function answerPractice(action) {
    if (!state.practice.current) newPracticeDrill();
    const best = state.practice.current.analysis.best.action;
    const correct = action === best;
    state.practice.total += 1;
    if (correct) state.practice.correct += 1;
    elements.practiceFeedback.innerHTML = `${correct ? "Correct" : `Best move was ${best}`}. EV ${formatEv(state.practice.current.analysis.best.ev)}. Accuracy: <strong id="practiceScore">${state.practice.correct}/${state.practice.total}</strong>`;
    elements.practiceScore = $("#practiceScore");
    state.practice.current = null;
  }

  function bindEvents() {
    // All event wiring is centralized here so startup is easy to follow.
    elements.undoButton.addEventListener("click", () => { state.playerCards.pop(); render(); });
    elements.clearDealerButton.addEventListener("click", () => { state.dealerUpcard = null; render(); });
    elements.newHandButton.addEventListener("click", () => { state.dealerUpcard = null; state.playerCards = []; render(); });
    elements.clearSeenButton.addEventListener("click", () => { state.seenCards = []; render(); });
    elements.logDecisionButton.addEventListener("click", logDecision);
    elements.trackerToggle.addEventListener("click", () => {
      const expanded = elements.trackerToggle.getAttribute("aria-expanded") === "true";
      elements.trackerToggle.setAttribute("aria-expanded", String(!expanded));
      elements.trackerBody.hidden = expanded;
    });
    elements.modeSwitch.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => applyRules({ mode: button.dataset.mode }));
    });
    elements.settingsButton.addEventListener("click", openSettings);
    elements.closeSettingsButton.addEventListener("click", closeSettings);
    elements.settingsModal.addEventListener("click", (event) => { if (event.target === elements.settingsModal) closeSettings(); });
    elements.saveSettingsButton.addEventListener("click", () => {
      applyRules({
        mode: elements.modeSetting.value,
        enginePrecision: elements.precisionSetting.value,
        decks: Number(elements.decksSetting.value),
        blackjackPayout: Number(elements.payoutSetting.value),
        dealerHitsSoft17: elements.h17Setting.checked,
        lateSurrender: elements.surrenderSetting.checked,
        doubleAfterSplit: elements.dasSetting.checked,
        dealerPeeked: elements.peekSetting.checked && !elements.noHoleSetting.checked,
        noHoleCard: elements.noHoleSetting.checked,
        doublePolicy: elements.doublePolicySetting.value,
        splitAces: elements.splitAcesSetting.checked,
        resplitAces: elements.resplitAcesSetting.checked,
        sideBets: elements.sideBetsSetting.checked,
      });
      closeSettings();
    });
    [elements.bankrollInput, elements.minBetInput, elements.maxBetInput, elements.riskSetting].forEach((input) => {
      input.addEventListener("input", renderBankroll);
      input.addEventListener("change", renderBankroll);
    });
    [elements.depositInput, elements.bonusInput, elements.wagerInput, elements.contributionInput].forEach((input) => {
      input.addEventListener("input", renderBonus);
      input.addEventListener("change", renderBonus);
    });
    elements.newPracticeButton.addEventListener("click", newPracticeDrill);
    elements.practiceActions.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => answerPractice(button.dataset.practiceAction));
    });
    elements.clearHistoryButton.addEventListener("click", () => {
      state.history = [];
      saveHistory();
      renderHistory();
    });
    document.addEventListener("keydown", (event) => {
      if (!elements.settingsModal.hidden && event.key === "Escape") return closeSettings();
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      const map = { "1": "A", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9", "0": "10", t: "10", j: "J", q: "Q", k: "K", a: "A" };
      const rank = map[event.key.toLowerCase()];
      if (!rank) return;
      if (!state.dealerUpcard) addCard("dealer", rank);
      else addCard("player", rank);
    });
  }

  buildRankGrids();
  bindEvents();
  render();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
})();
