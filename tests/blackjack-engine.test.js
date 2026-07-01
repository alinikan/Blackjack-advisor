const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../blackjack-engine.js");

const baseRules = {
  decks: 6,
  enginePrecision: "fast",
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  lateSurrender: false,
  doubleAfterSplit: true,
  dealerPeeked: true,
};

function decision(playerCards, dealerUpcard, extraRules = {}) {
  return engine.analyze({ playerCards, dealerUpcard, seenCards: [], rules: { ...baseRules, ...extraRules } }).best.action;
}

test("calculates hard and soft hand totals", () => {
  assert.deepEqual(engine.handState(["A", "6"]), { total: 17, soft: true, softAces: 1, bust: false, blackjack: false });
  assert.equal(engine.handState(["A", "6", "10"]).total, 17);
  assert.equal(engine.handState(["K", "Q", "2"]).bust, true);
});

test("recognizes a natural blackjack", () => {
  assert.equal(decision(["A", "K"], "6"), "BLACKJACK");
});

test("stands on hard 17 against a dealer 10", () => {
  assert.equal(decision(["10", "7"], "10"), "STAND");
});

test("hits hard 12 against a dealer 2", () => {
  assert.equal(decision(["10", "2"], "2"), "HIT");
});

test("doubles 11 against a dealer 6", () => {
  assert.equal(decision(["6", "5"], "6"), "DOUBLE");
});

test("splits aces against a dealer 6", () => {
  assert.equal(decision(["A", "A"], "6"), "SPLIT");
});

test("shoe composition removes visible ten-value cards", () => {
  const counts = engine.shoeCounts(1, ["10", "J", "Q", "K", "A"]);
  assert.equal(counts["10"], 12);
  assert.equal(counts.A, 3);
});

test("exact finite model is available for audit decisions", () => {
  const result = engine.analyze({ playerCards: ["6", "5"], dealerUpcard: "6", seenCards: [], rules: { ...baseRules, enginePrecision: "exact" } });
  assert.equal(result.model, "exact finite");
  assert.equal(result.best.action, "DOUBLE");
});

test("bad 6:5 tables are scored much worse than premium rules", () => {
  const premium = engine.profileTable({ ...baseRules, lateSurrender: true, blackjackPayout: 1.5 });
  const bad = engine.profileTable({ ...baseRules, blackjackPayout: 1.2, dealerHitsSoft17: true, lateSurrender: false, doubleAfterSplit: false, doublePolicy: "tenEleven" });
  assert.ok(premium.score > bad.score);
  assert.ok(bad.houseEdgePercent > premium.houseEdgePercent + 1);
});

test("RNG mode ignores previously seen cards but live mode uses them", () => {
  const live = engine.analyze({ playerCards: ["10", "6"], dealerUpcard: "10", seenCards: ["5", "5", "5", "5"], rules: { ...baseRules, mode: "live" } });
  const rng = engine.analyze({ playerCards: ["10", "6"], dealerUpcard: "10", seenCards: ["5", "5", "5", "5"], rules: { ...baseRules, mode: "rng" } });
  assert.notEqual(live.cardsLeft, rng.cardsLeft);
  assert.equal(rng.trueCount, 0);
});

test("bankroll advice avoids oversized bets on negative edge games", () => {
  const advice = engine.bankrollAdvice({ bankroll: 1000, minBet: 10, maxBet: 200, rules: { ...baseRules, mode: "rng" } });
  assert.equal(advice.suggestedBet, 10);
  assert.ok(advice.playerAdvantage < 0);
});

test("bonus calculator reports positive EV when bonus exceeds expected loss", () => {
  const promo = engine.bonusValue({ deposit: 100, bonus: 100, multiplier: 10, contribution: 100, houseEdgePercent: 0.5 });
  assert.ok(promo.ev > 0);
  assert.equal(promo.wageringRequired, 2000);
});
