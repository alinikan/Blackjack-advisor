(function (root, factory) {
  /*
   * Blackjack Signal's math engine is written as a tiny "universal" module:
   * - In the browser it becomes window.BlackjackEngine.
   * - In Node tests it becomes module.exports.
   *
   * Keeping the engine independent from the UI makes it much easier to test,
   * audit, and reuse in the offline .app bundle.
   */
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BlackjackEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /*
   * Ranks are collapsed to 10 buckets because blackjack strategy only cares
   * about card value, not suit. J/Q/K are all represented as "10".
   */
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const DISPLAY_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const TEN_RANKS = new Set(["10", "T", "J", "Q", "K"]);
  const BASE_COUNTS = { A: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 16 };
  const HI_LO = { A: -1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0, 8: 0, 9: 0, 10: -1 };

  /*
   * The default is the fast live model because this app is meant to be usable
   * while a hand is happening. Exact finite-shoe mode is available as an audit
   * setting when you want deeper analysis and can tolerate slower split hands.
   */
  const DEFAULT_RULES = {
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
  };
  const TABLE_PRESETS = {
    premiumLive: {
      label: "Premium live shoe",
      rules: { mode: "live", enginePrecision: "exact", decks: 6, dealerHitsSoft17: false, blackjackPayout: 1.5, lateSurrender: true, doubleAfterSplit: true, dealerPeeked: true, noHoleCard: false, doublePolicy: "anyTwo", splitAces: true, resplitAces: true, maxSplitHands: 4 },
    },
    commonLive: {
      label: "Common live dealer",
      rules: { mode: "live", enginePrecision: "exact", decks: 8, dealerHitsSoft17: true, blackjackPayout: 1.5, lateSurrender: false, doubleAfterSplit: true, dealerPeeked: true, noHoleCard: false, doublePolicy: "anyTwo", splitAces: true, resplitAces: false, maxSplitHands: 4 },
    },
    onlineRng: {
      label: "Online RNG",
      rules: { mode: "rng", enginePrecision: "exact", decks: 6, dealerHitsSoft17: true, blackjackPayout: 1.5, lateSurrender: false, doubleAfterSplit: true, dealerPeeked: true, noHoleCard: false, doublePolicy: "anyTwo", splitAces: true, resplitAces: false, maxSplitHands: 4 },
    },
    badSixToFive: {
      label: "6:5 table",
      rules: { mode: "rng", enginePrecision: "exact", decks: 6, dealerHitsSoft17: true, blackjackPayout: 1.2, lateSurrender: false, doubleAfterSplit: false, dealerPeeked: true, noHoleCard: false, doublePolicy: "tenEleven", splitAces: true, resplitAces: false, maxSplitHands: 3 },
    },
  };

  function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function normalizeRank(rank) {
    const value = String(rank).trim().toUpperCase();
    if (TEN_RANKS.has(value)) return "10";
    if (RANKS.includes(value)) return value;
    throw new Error(`Unknown card rank: ${rank}`);
  }

  function normalizeRules(rules) {
    // Normalize user/settings input once so the rest of the engine can assume
    // clean numeric/boolean values and consistent no-hole-card behavior.
    const normalized = { ...DEFAULT_RULES, ...(rules || {}) };
    normalized.decks = Math.max(1, Number(normalized.decks) || DEFAULT_RULES.decks);
    normalized.blackjackPayout = Number(normalized.blackjackPayout) || DEFAULT_RULES.blackjackPayout;
    normalized.maxSplitHands = Math.max(2, Number(normalized.maxSplitHands) || DEFAULT_RULES.maxSplitHands);
    if (normalized.noHoleCard) normalized.dealerPeeked = false;
    return normalized;
  }

  function cardValue(rank) {
    const normalized = normalizeRank(rank);
    if (normalized === "A") return 11;
    if (normalized === "10") return 10;
    return Number(normalized);
  }

  function handState(cards) {
    /*
     * Computes blackjack hand state with ace adjustment:
     * - Aces start as 11.
     * - Each ace can be reduced to 1 by subtracting 10.
     * - `soft` means at least one ace is still counting as 11.
     */
    let total = 0;
    let aces = 0;
    cards.forEach((card) => {
      const rank = normalizeRank(card);
      total += cardValue(rank);
      if (rank === "A") aces += 1;
    });
    let softAces = aces;
    while (total > 21 && softAces > 0) {
      total -= 10;
      softAces -= 1;
    }
    return {
      total,
      soft: softAces > 0,
      softAces,
      bust: total > 21,
      blackjack: cards.length === 2 && total === 21,
    };
  }

  function addCardToState(state, rank) {
    let total = state.total + cardValue(rank);
    let softAces = state.softAces + (normalizeRank(rank) === "A" ? 1 : 0);
    while (total > 21 && softAces > 0) {
      total -= 10;
      softAces -= 1;
    }
    return { total, softAces, soft: softAces > 0, bust: total > 21, blackjack: false };
  }

  function blankCounts() {
    const counts = {};
    RANKS.forEach((rank) => { counts[rank] = 0; });
    return counts;
  }

  function shoeCounts(decks, visibleCards) {
    // Build the remaining shoe after removing all known visible cards.
    // In live-shoe mode this can include other players' exposed cards.
    const counts = {};
    RANKS.forEach((rank) => { counts[rank] = BASE_COUNTS[rank] * decks; });
    (visibleCards || []).forEach((card) => {
      const rank = normalizeRank(card);
      counts[rank] = Math.max(0, counts[rank] - 1);
    });
    return counts;
  }

  function countsToArray(counts) {
    return RANKS.map((rank) => counts[rank] || 0);
  }

  function arrayToCounts(array) {
    const counts = {};
    RANKS.forEach((rank, index) => { counts[rank] = array[index] || 0; });
    return counts;
  }

  function countsTotal(counts) {
    return counts.reduce((sum, count) => sum + count, 0);
  }

  function countsKey(counts) {
    return counts.join(",");
  }

  function decrementCount(counts, index) {
    const next = counts.slice();
    next[index] -= 1;
    return next;
  }

  function probabilitiesFromCounts(counts) {
    const total = RANKS.reduce((sum, rank) => sum + counts[rank], 0);
    const probabilities = {};
    RANKS.forEach((rank) => { probabilities[rank] = total ? counts[rank] / total : 0; });
    return { probabilities, total };
  }

  function emptyDistribution() {
    return { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0, blackjack: 0 };
  }

  function addWeighted(target, source, weight) {
    Object.keys(target).forEach((key) => { target[key] += source[key] * weight; });
    return target;
  }

  function makeStats(ev, win, push, loss, meta) {
    return { ev, win, push, loss, ...(meta || {}) };
  }

  function normalizeStats(stats) {
    const total = stats.win + stats.push + stats.loss;
    if (!total || Math.abs(total - 1) < 0.000001) return stats;
    return makeStats(stats.ev, stats.win / total, stats.push / total, stats.loss / total, stats);
  }

  function canDoubleState(cards, player, rules, afterSplit) {
    if (cards.length !== 2 || rules.doublePolicy === "none") return false;
    if (afterSplit && !rules.doubleAfterSplit) return false;
    if (rules.doublePolicy === "anyTwo") return true;
    if (rules.doublePolicy === "nineToEleven") return player.total >= 9 && player.total <= 11;
    if (rules.doublePolicy === "hard9To11") return !player.soft && player.total >= 9 && player.total <= 11;
    if (rules.doublePolicy === "tenEleven") return player.total === 10 || player.total === 11;
    return true;
  }

  function canSplitCards(cards, rules) {
    if (cards.length !== 2) return false;
    const first = normalizeRank(cards[0]);
    const second = normalizeRank(cards[1]);
    if (first !== second) return false;
    if (first === "A" && !rules.splitAces) return false;
    return rules.maxSplitHands >= 2;
  }

  function dealerDistributionApprox(upcard, probabilities, rules) {
    /*
     * Fast dealer model.
     *
     * This uses the current remaining-card probabilities and reuses them for
     * future dealer draws. It is extremely fast and stable for live use. It is
     * a close approximation to finite-shoe math, but does not remove each
     * future dealer draw recursively.
     */
    const up = normalizeRank(upcard);
    const memo = new Map();

    function draw(total, softAces) {
      const key = `${total}|${softAces}`;
      if (memo.has(key)) return memo.get(key);
      const result = emptyDistribution();
      if (total > 21) {
        result.bust = 1;
        memo.set(key, result);
        return result;
      }
      const soft = softAces > 0;
      const mustHit = total < 17 || (total === 17 && soft && rules.dealerHitsSoft17);
      if (!mustHit) {
        result[String(total)] = 1;
        memo.set(key, result);
        return result;
      }
      RANKS.forEach((rank) => {
        const p = probabilities[rank];
        if (!p) return;
        const next = addCardToState({ total, softAces }, rank);
        addWeighted(result, draw(next.total, next.softAces), p);
      });
      memo.set(key, result);
      return result;
    }

    const result = emptyDistribution();
    const forbiddenHole = rules.dealerPeeked && (up === "A" || up === "10") ? (up === "A" ? "10" : "A") : null;
    const allowedMass = RANKS.reduce((sum, rank) => sum + (rank === forbiddenHole ? 0 : probabilities[rank]), 0);
    const upState = handState([up]);

    RANKS.forEach((hole) => {
      if (hole === forbiddenHole || !probabilities[hole] || !allowedMass) return;
      const p = probabilities[hole] / allowedMass;
      const initial = addCardToState(upState, hole);
      if (initial.total === 21) {
        const blackjack = emptyDistribution();
        blackjack.blackjack = 1;
        addWeighted(result, blackjack, p);
      } else {
        addWeighted(result, draw(initial.total, initial.softAces), p);
      }
    });
    return result;
  }

  function dealerDistributionFinite(upcard, counts, rules) {
    /*
     * Exact finite-shoe dealer model.
     *
     * This removes every drawn card from the shoe and memoizes by:
     * - dealer total
     * - soft ace count
     * - exact remaining shoe composition
     *
     * It is more accurate, especially late in a shoe, but can be slower.
     */
    const up = normalizeRank(upcard);
    const upState = handState([up]);
    const drawMemo = new Map();

    function draw(total, softAces, shoe) {
      const key = `${total}|${softAces}|${countsKey(shoe)}`;
      if (drawMemo.has(key)) return drawMemo.get(key);
      const result = emptyDistribution();
      if (total > 21) {
        result.bust = 1;
        drawMemo.set(key, result);
        return result;
      }
      const soft = softAces > 0;
      const mustHit = total < 17 || (total === 17 && soft && rules.dealerHitsSoft17);
      if (!mustHit) {
        result[String(total)] = 1;
        drawMemo.set(key, result);
        return result;
      }
      const totalCards = countsTotal(shoe);
      if (!totalCards) {
        result[String(Math.min(total, 21))] = 1;
        drawMemo.set(key, result);
        return result;
      }
      RANKS.forEach((rank, index) => {
        const available = shoe[index];
        if (!available) return;
        const p = available / totalCards;
        const nextShoe = decrementCount(shoe, index);
        const next = addCardToState({ total, softAces }, rank);
        addWeighted(result, draw(next.total, next.softAces, nextShoe), p);
      });
      drawMemo.set(key, result);
      return result;
    }

    const result = emptyDistribution();
    const forbiddenHole = rules.dealerPeeked && (up === "A" || up === "10") ? (up === "A" ? "10" : "A") : null;
    const allowedTotal = counts.reduce((sum, count, index) => sum + (RANKS[index] === forbiddenHole ? 0 : count), 0);
    if (!allowedTotal) return result;
    RANKS.forEach((hole, index) => {
      const available = counts[index];
      if (!available || hole === forbiddenHole) return;
      const p = available / allowedTotal;
      const nextShoe = decrementCount(counts, index);
      const initial = addCardToState(upState, hole);
      if (initial.total === 21) {
        const blackjack = emptyDistribution();
        blackjack.blackjack = 1;
        addWeighted(result, blackjack, p);
      } else {
        addWeighted(result, draw(initial.total, initial.softAces, nextShoe), p);
      }
    });
    return result;
  }

  function actionListFromAnalyzer(context) {
    const { playerCards, player, rules, standStats, hitStats, doubleStats, splitStats } = context;
    const actions = [];
    if (player.bust) {
      actions.push({ action: "BUST", ...makeStats(-1, 0, 0, 1) });
    } else if (player.blackjack) {
      actions.push({ action: "BLACKJACK", ...standStats(player, true) });
    } else {
      actions.push({ action: "STAND", ...standStats(player, false) });
      actions.push({ action: "HIT", ...hitStats(player) });
      if (canDoubleState(playerCards, player, rules, false)) actions.push({ action: "DOUBLE", ...doubleStats(player) });
      if (playerCards.length === 2 && rules.lateSurrender) actions.push({ action: "SURRENDER", ...makeStats(-0.5, 0, 0, 1) });
      if (canSplitCards(playerCards, rules)) actions.push({ action: "SPLIT", ...splitStats(normalizeRank(playerCards[0])) });
    }
    return actions.sort((a, b) => b.ev - a.ev);
  }

  function analyzeApprox(input, rules, playerCards, dealerUpcard, seenCards, countsObject) {
    // Main fast path used by the live table UI.
    const { probabilities, total: cardsLeft } = probabilitiesFromCounts(countsObject);
    const dealer = dealerDistributionApprox(dealerUpcard, probabilities, rules);
    const player = handState(playerCards);
    const standMemo = new Map();
    const optimalMemo = new Map();

    function standStats(state, natural) {
      const key = `${state.total}|${state.softAces}|${natural ? 1 : 0}`;
      if (standMemo.has(key)) return standMemo.get(key);
      if (state.total > 21) return makeStats(-1, 0, 0, 1);
      let ev = 0;
      let win = 0;
      let push = 0;
      let loss = 0;
      Object.entries(dealer).forEach(([outcome, p]) => {
        if (!p) return;
        if (outcome === "blackjack") {
          if (natural) push += p;
          else { loss += p; ev -= p; }
          return;
        }
        if (natural) {
          win += p;
          ev += p * rules.blackjackPayout;
          return;
        }
        if (outcome === "bust" || state.total > Number(outcome)) {
          win += p;
          ev += p;
        } else if (state.total === Number(outcome)) {
          push += p;
        } else {
          loss += p;
          ev -= p;
        }
      });
      const result = normalizeStats(makeStats(ev, win, push, loss));
      standMemo.set(key, result);
      return result;
    }

    function combineBranches(branches) {
      return branches.reduce((acc, branch) => {
        acc.ev += branch.stats.ev * branch.p;
        acc.win += branch.stats.win * branch.p;
        acc.push += branch.stats.push * branch.p;
        acc.loss += branch.stats.loss * branch.p;
        return acc;
      }, makeStats(0, 0, 0, 0));
    }

    function hitStats(state) {
      const branches = [];
      RANKS.forEach((rank) => {
        const p = probabilities[rank];
        if (!p) return;
        const next = addCardToState(state, rank);
        if (next.bust) branches.push({ p, stats: makeStats(-1, 0, 0, 1) });
        else branches.push({ p, stats: optimalStats(next) });
      });
      return combineBranches(branches);
    }

    function optimalStats(state) {
      /*
       * After a hit, the player may need to choose again. This recursive helper
       * compares hit vs stand from each future total and memoizes the result.
       */
      const key = `${state.total}|${state.softAces}`;
      if (optimalMemo.has(key)) return optimalMemo.get(key);
      const stand = standStats(state, false);
      const hit = hitStats(state);
      const best = hit.ev > stand.ev ? { ...hit, continuation: "HIT" } : { ...stand, continuation: "STAND" };
      optimalMemo.set(key, best);
      return best;
    }

    function doubleStats(state) {
      const branches = [];
      RANKS.forEach((rank) => {
        const p = probabilities[rank];
        if (!p) return;
        const next = addCardToState(state, rank);
        const outcome = next.bust ? makeStats(-1, 0, 0, 1) : standStats(next, false);
        branches.push({ p, stats: makeStats(outcome.ev * 2, outcome.win, outcome.push, outcome.loss) });
      });
      return combineBranches(branches);
    }

    function splitStats(rank) {
      const branches = [];
      RANKS.forEach((drawn) => {
        const p = probabilities[drawn];
        if (!p) return;
        const state = handState([rank, drawn]);
        let best;
        if (rank === "A") best = standStats(state, false);
        else {
          const candidates = [standStats(state, false), hitStats(state)];
          if (rules.doubleAfterSplit && canDoubleState([rank, drawn], state, rules, true)) candidates.push(doubleStats(state));
          best = candidates.reduce((a, b) => b.ev > a.ev ? b : a);
        }
        branches.push({ p, stats: best });
      });
      const perHand = combineBranches(branches);
      return makeStats(perHand.ev * 2, perHand.win, perHand.push, perHand.loss, { perHand: true, splitModel: "per-hand" });
    }

    const actions = actionListFromAnalyzer({ playerCards, player, rules, standStats, hitStats, doubleStats, splitStats });
    return finishAnalysis(input, rules, playerCards, dealerUpcard, seenCards, countsObject, cardsLeft, probabilities, dealer, player, actions, "fast");
  }

  function analyzeFinite(input, rules, playerCards, dealerUpcard, seenCards, countsObject) {
    // Exact audit path. Every simulated draw removes a card from the shoe.
    const counts = countsToArray(countsObject);
    const player = handState(playerCards);
    const cardsLeft = countsTotal(counts);
    const probabilities = probabilitiesFromCounts(countsObject).probabilities;
    const dealerMemo = new Map();
    const standMemo = new Map();
    const optimalMemo = new Map();
    let rootDealer = null;

    function getDealer(shoe) {
      const key = countsKey(shoe);
      if (dealerMemo.has(key)) return dealerMemo.get(key);
      const distribution = dealerDistributionFinite(dealerUpcard, shoe, rules);
      dealerMemo.set(key, distribution);
      return distribution;
    }

    function standStatsForShoe(state, natural, shoe) {
      const key = `${state.total}|${state.softAces}|${natural ? 1 : 0}|${countsKey(shoe)}`;
      if (standMemo.has(key)) return standMemo.get(key);
      if (state.total > 21) return makeStats(-1, 0, 0, 1);
      const dealer = getDealer(shoe);
      let ev = 0;
      let win = 0;
      let push = 0;
      let loss = 0;
      Object.entries(dealer).forEach(([outcome, p]) => {
        if (!p) return;
        if (outcome === "blackjack") {
          if (natural) push += p;
          else { loss += p; ev -= p; }
          return;
        }
        if (natural) {
          win += p;
          ev += p * rules.blackjackPayout;
          return;
        }
        if (outcome === "bust" || state.total > Number(outcome)) {
          win += p;
          ev += p;
        } else if (state.total === Number(outcome)) {
          push += p;
        } else {
          loss += p;
          ev -= p;
        }
      });
      const result = normalizeStats(makeStats(ev, win, push, loss));
      standMemo.set(key, result);
      return result;
    }

    function combineBranches(branches) {
      return branches.reduce((acc, branch) => {
        acc.ev += branch.stats.ev * branch.p;
        acc.win += branch.stats.win * branch.p;
        acc.push += branch.stats.push * branch.p;
        acc.loss += branch.stats.loss * branch.p;
        return acc;
      }, makeStats(0, 0, 0, 0));
    }

    function hitStatsForShoe(state, shoe) {
      const totalCards = countsTotal(shoe);
      if (!totalCards) return standStatsForShoe(state, false, shoe);
      const branches = [];
      RANKS.forEach((rank, index) => {
        const available = shoe[index];
        if (!available) return;
        const p = available / totalCards;
        const nextShoe = decrementCount(shoe, index);
        const next = addCardToState(state, rank);
        if (next.bust) branches.push({ p, stats: makeStats(-1, 0, 0, 1) });
        else branches.push({ p, stats: optimalStatsForShoe(next, nextShoe) });
      });
      return combineBranches(branches);
    }

    function optimalStatsForShoe(state, shoe) {
      const key = `${state.total}|${state.softAces}|${countsKey(shoe)}`;
      if (optimalMemo.has(key)) return optimalMemo.get(key);
      const stand = standStatsForShoe(state, false, shoe);
      const hit = hitStatsForShoe(state, shoe);
      const best = hit.ev > stand.ev ? { ...hit, continuation: "HIT" } : { ...stand, continuation: "STAND" };
      optimalMemo.set(key, best);
      return best;
    }

    function doubleStatsForShoe(state, shoe) {
      const totalCards = countsTotal(shoe);
      if (!totalCards) return standStatsForShoe(state, false, shoe);
      const branches = [];
      RANKS.forEach((rank, index) => {
        const available = shoe[index];
        if (!available) return;
        const p = available / totalCards;
        const nextShoe = decrementCount(shoe, index);
        const next = addCardToState(state, rank);
        const outcome = next.bust ? makeStats(-1, 0, 0, 1) : standStatsForShoe(next, false, nextShoe);
        branches.push({ p, stats: makeStats(outcome.ev * 2, outcome.win, outcome.push, outcome.loss) });
      });
      return combineBranches(branches);
    }

    function splitStatsForShoe(rank, shoe) {
      const totalCards = countsTotal(shoe);
      if (!totalCards) return makeStats(0, 0, 1, 0, { splitModel: "empty-shoe" });
      const branches = [];
      RANKS.forEach((drawn, index) => {
        const available = shoe[index];
        if (!available) return;
        const p = available / totalCards;
        const nextShoe = decrementCount(shoe, index);
        const splitHand = [rank, drawn];
        const state = handState(splitHand);
        let best;
        if (rank === "A") best = standStatsForShoe(state, false, nextShoe);
        else {
          const candidates = [standStatsForShoe(state, false, nextShoe), hitStatsForShoe(state, nextShoe)];
          if (rules.doubleAfterSplit && canDoubleState(splitHand, state, rules, true)) candidates.push(doubleStatsForShoe(state, nextShoe));
          best = candidates.reduce((a, b) => b.ev > a.ev ? b : a);
        }
        branches.push({ p, stats: best });
      });
      const perHand = combineBranches(branches);
      return makeStats(perHand.ev * 2, perHand.win, perHand.push, perHand.loss, { perHand: true, splitModel: "finite per-hand" });
    }

    const actions = actionListFromAnalyzer({
      playerCards,
      player,
      rules,
      standStats: (state, natural) => standStatsForShoe(state, natural, counts),
      hitStats: (state) => hitStatsForShoe(state, counts),
      doubleStats: (state) => doubleStatsForShoe(state, counts),
      splitStats: (rank) => splitStatsForShoe(rank, counts),
    });
    rootDealer = getDealer(counts);
    return finishAnalysis(input, rules, playerCards, dealerUpcard, seenCards, countsObject, cardsLeft, probabilities, rootDealer, player, actions, "exact finite");
  }

  function finishAnalysis(input, rules, playerCards, dealerUpcard, seenCards, countsObject, cardsLeft, probabilities, dealer, player, actions, model) {
    // Shared final assembly for both fast and exact paths.
    const best = actions[0];
    const runnerUp = actions[1];
    const visibleForCount = rules.mode === "live" ? [dealerUpcard, ...playerCards, ...seenCards] : [dealerUpcard, ...playerCards];
    const runningCount = visibleForCount.reduce((sum, rank) => sum + HI_LO[normalizeRank(rank)], 0);
    const decksRemaining = Math.max(cardsLeft / 52, 0.25);
    const trueCount = rules.mode === "live" ? runningCount / decksRemaining : 0;
    const table = profileTable(rules);
    const tenDensity = cardsLeft ? (countsObject["10"] || 0) / cardsLeft : 0;
    const insurance = dealerUpcard === "A"
      ? { available: true, tenDensity, ev: tenDensity * 1.5 - 0.5, profitable: tenDensity > 1 / 3 }
      : { available: false, tenDensity, ev: 0, profitable: false };
    const elapsed = now() - input.startedAt;
    const warnings = decisionWarnings({ best, actions, player, rules, table, trueCount, insurance });
    return {
      best,
      actions,
      player,
      dealer,
      probabilities,
      cardsLeft,
      runningCount,
      trueCount,
      edgeOverNext: runnerUp ? best.ev - runnerUp.ev : 0,
      elapsedMs: elapsed,
      rules,
      model,
      table,
      insurance,
      warnings,
    };
  }

  function analyze(input) {
    /*
     * Public entry point used by the UI and tests.
     *
     * RNG/CSM modes intentionally ignore previously seen table cards because
     * reshuffling or continuous shuffling destroys the predictive value.
     */
    const startedAt = now();
    const rules = normalizeRules(input.rules);
    const playerCards = (input.playerCards || []).map(normalizeRank);
    const dealerUpcard = normalizeRank(input.dealerUpcard);
    const seenCards = (input.seenCards || []).map(normalizeRank);
    const trackedSeenCards = rules.mode === "live" ? seenCards : [];
    const counts = shoeCounts(rules.decks, [dealerUpcard, ...playerCards, ...trackedSeenCards]);
    const enrichedInput = { ...input, startedAt };
    if (rules.enginePrecision === "fast") {
      return analyzeApprox(enrichedInput, rules, playerCards, dealerUpcard, trackedSeenCards, counts);
    }
    return analyzeFinite(enrichedInput, rules, playerCards, dealerUpcard, trackedSeenCards, counts);
  }

  function estimatedHouseEdgePercent(rawRules) {
    /*
     * Lightweight table-quality estimator.
     *
     * This is not a full casino house-edge calculator; it is a practical
     * profiler that penalizes the rule changes known to hurt players most.
     */
    const rules = normalizeRules(rawRules);
    let edge = 0.34;
    const deckAdjustment = { 1: -0.13, 2: -0.08, 4: -0.03, 6: 0, 8: 0.02 };
    edge += deckAdjustment[rules.decks] || 0;
    if (rules.dealerHitsSoft17) edge += 0.22;
    if (rules.blackjackPayout < 1.5) edge += rules.blackjackPayout <= 1.2 ? 1.39 : (1.5 - rules.blackjackPayout) * 4.6;
    if (!rules.lateSurrender) edge += 0.07;
    if (!rules.doubleAfterSplit) edge += 0.14;
    if (rules.noHoleCard) edge += 0.11;
    if (rules.doublePolicy === "nineToEleven") edge += 0.08;
    if (rules.doublePolicy === "hard9To11") edge += 0.11;
    if (rules.doublePolicy === "tenEleven") edge += 0.18;
    if (rules.doublePolicy === "none") edge += 0.65;
    if (!rules.splitAces) edge += 0.19;
    if (!rules.resplitAces) edge += 0.07;
    if (rules.maxSplitHands < 4) edge += 0.04;
    if (rules.sideBets) edge += 0.05;
    return Math.max(0.05, edge);
  }

  function profileTable(rawRules) {
    const rules = normalizeRules(rawRules);
    const houseEdgePercent = estimatedHouseEdgePercent(rules);
    const warnings = [];
    const strengths = [];
    if (rules.blackjackPayout < 1.5) warnings.push("Blackjack pays less than 3:2. This is one of the largest avoid signals.");
    else strengths.push("Blackjack pays 3:2.");
    if (rules.dealerHitsSoft17) warnings.push("Dealer hits soft 17, adding house edge.");
    else strengths.push("Dealer stands on soft 17.");
    if (!rules.lateSurrender) warnings.push("No late surrender available.");
    else strengths.push("Late surrender is available.");
    if (!rules.doubleAfterSplit) warnings.push("No double after split.");
    if (rules.doublePolicy !== "anyTwo") warnings.push("Double-down choices are restricted.");
    if (rules.noHoleCard) warnings.push("No-hole-card rules can make doubles and splits more expensive when dealer has blackjack.");
    if (rules.mode === "rng") warnings.push("RNG games reshuffle every hand. Counting seen cards from prior hands has no predictive value.");
    if (rules.mode === "csm") warnings.push("Continuous shuffling removes practical shoe-tracking value.");
    if (rules.sideBets) warnings.push("Side bets usually carry a much higher house edge than the main blackjack wager.");
    if (rules.mode === "live") strengths.push("Live shoe mode can use exposed-card tracking until the shuffle.");
    const score = Math.max(0, Math.min(100, Math.round(96 - houseEdgePercent * 18 - (rules.mode === "csm" ? 5 : 0) - (rules.blackjackPayout < 1.5 ? 12 : 0))));
    const grade = score >= 88 ? "A" : score >= 78 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "Avoid";
    return { score, grade, houseEdgePercent, warnings, strengths };
  }

  function decisionWarnings({ best, actions, player, rules, table, trueCount, insurance }) {
    const warnings = [];
    if (rules.blackjackPayout < 1.5) warnings.push({ tone: "danger", title: "6:5 payout drag", body: "A reduced blackjack payout can erase far more value than perfect play can recover." });
    if (rules.mode !== "live") warnings.push({ tone: "warn", title: "No count edge", body: "This mode treats previous hands as unhelpful. Focus on rules, speed, and avoiding mistakes." });
    if (insurance.available && !insurance.profitable) warnings.push({ tone: "warn", title: "Decline insurance", body: `Ten density is ${(insurance.tenDensity * 100).toFixed(1)}%; insurance needs more than 33.3%.` });
    if (insurance.available && insurance.profitable) warnings.push({ tone: "good", title: "Insurance is +EV", body: `Ten density is ${(insurance.tenDensity * 100).toFixed(1)}%; this is a live-shoe exception.` });
    if (table.grade === "Avoid" || table.grade === "D") warnings.push({ tone: "danger", title: "Weak table rules", body: `Estimated house edge is about ${table.houseEdgePercent.toFixed(2)}% before mistakes.` });
    if (best && best.action === "SURRENDER") warnings.push({ tone: "warn", title: "Surrender saves value", body: "Playing the hand loses more on average than giving up half now." });
    if (player.total === 16 && actions.some((action) => action.action === "STAND") && actions[0].action !== "STAND") warnings.push({ tone: "warn", title: "Do not freeze on 16", body: "This is a high-mistake hand. Follow the ranked EV option." });
    if (rules.mode === "live" && trueCount >= 3) warnings.push({ tone: "good", title: "Positive count zone", body: "The shoe is rich in high cards. Bet sizing can become more important than minor play differences." });
    return warnings;
  }

  function bankrollAdvice(input) {
    /*
     * Kelly-style bet sizing helper. It intentionally returns the minimum bet
     * when estimated edge is negative, because increasing bet size in a
     * negative-EV game only increases expected loss.
     */
    const rules = normalizeRules(input.rules);
    const table = input.table || profileTable(rules);
    const bankroll = Math.max(0, Number(input.bankroll) || 0);
    const minBet = Math.max(0, Number(input.minBet) || 0);
    const maxBet = Math.max(minBet || 1, Number(input.maxBet) || minBet || 1);
    const risk = input.risk || "cautious";
    const riskScale = { cautious: 0.25, balanced: 0.5, aggressive: 0.75 }[risk] || 0.25;
    const countEdge = rules.mode === "live" ? Math.max(0, (Number(input.trueCount) || 0) - 1) * 0.005 : 0;
    const playerAdvantage = countEdge - table.houseEdgePercent / 100;
    const fullKelly = Math.max(0, playerAdvantage / 1.3);
    const suggested = playerAdvantage <= 0 || !bankroll ? minBet : Math.min(maxBet, Math.max(minBet, bankroll * fullKelly * riskScale));
    const units = minBet ? bankroll / minBet : 0;
    const riskLabel = playerAdvantage > 0 ? "positive-edge sizing" : "minimum-bet or skip";
    const message = playerAdvantage > 0
      ? `Estimated player edge is ${(playerAdvantage * 100).toFixed(2)}%. Suggested bet uses ${Math.round(riskScale * 100)}% Kelly.`
      : `Estimated edge is ${(playerAdvantage * 100).toFixed(2)}%. Betting more than table minimum increases expected loss.`;
    return {
      bankroll,
      minBet,
      maxBet,
      suggestedBet: Number.isFinite(suggested) ? suggested : 0,
      fullKellyFraction: fullKelly,
      usedKellyFraction: fullKelly * riskScale,
      playerAdvantage,
      units,
      riskLabel,
      message,
    };
  }

  function bonusValue(input) {
    // Estimates whether a bonus is worth pursuing after wagering requirements.
    const deposit = Math.max(0, Number(input.deposit) || 0);
    const bonus = Math.max(0, Number(input.bonus) || 0);
    const multiplier = Math.max(0, Number(input.multiplier) || 0);
    const contribution = Math.max(1, Math.min(100, Number(input.contribution) || 100));
    const houseEdgePercent = Math.max(0, Number(input.houseEdgePercent) || 0);
    const basis = input.basis === "bonus" ? bonus : deposit + bonus;
    const wageringRequired = basis * multiplier / (contribution / 100);
    const expectedLoss = wageringRequired * houseEdgePercent / 100;
    const ev = bonus - expectedLoss;
    const breakEvenHouseEdgePercent = wageringRequired ? bonus / wageringRequired * 100 : 0;
    return { deposit, bonus, wageringRequired, expectedLoss, ev, breakEvenHouseEdgePercent, contribution };
  }

  function drawRandomRank(counts, random) {
    const total = countsTotal(counts);
    if (!total) return null;
    let cursor = random() * total;
    for (let index = 0; index < counts.length; index += 1) {
      cursor -= counts[index];
      if (cursor < 0) {
        counts[index] -= 1;
        return RANKS[index];
      }
    }
    return RANKS[RANKS.length - 1];
  }

  function generatePracticeHand(rawRules, random) {
    const rules = normalizeRules(rawRules);
    const rng = random || Math.random;
    const counts = countsToArray(shoeCounts(rules.decks, []));
    const dealerUpcard = drawRandomRank(counts, rng);
    const playerCards = [drawRandomRank(counts, rng), drawRandomRank(counts, rng)];
    const analysis = analyze({ dealerUpcard, playerCards, seenCards: [], rules: { ...rules, mode: "rng" } });
    return { dealerUpcard, playerCards, analysis };
  }

  return {
    RANKS,
    DISPLAY_RANKS,
    BASE_COUNTS,
    DEFAULT_RULES,
    TABLE_PRESETS,
    normalizeRank,
    normalizeRules,
    handState,
    shoeCounts,
    probabilitiesFromCounts,
    dealerDistribution: dealerDistributionApprox,
    dealerDistributionFinite,
    analyze,
    profileTable,
    estimatedHouseEdgePercent,
    bankrollAdvice,
    bonusValue,
    generatePracticeHand,
  };
});
