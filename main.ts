import { initCache } from "./cache";
import { getOdds, getPredictedProbability, League } from "./espn";

const DISCREPENCY_THRESHOLD: number = 4;
const BET_AMOUNT: number = 100;
type FAV_OR_DOG_OR_BOTH = "favorite" | "underdog" | "both";
const favOrDogOrBoth: FAV_OR_DOG_OR_BOTH = "both"; // Change this to "favorite" or "underdog" to only bet on favorites or underdogs
type AWAY_OR_HOME_OR_BOTH = "away" | "home" | "both";
const awayOrHomeOrBoth: AWAY_OR_HOME_OR_BOTH = "both"; // Change this to "away" or "home" to only bet on away or home teams
type UPSET_OR_NOUPSET_OR_BOTH = "upset" | "noupset" | "both";
const betUpset: UPSET_OR_NOUPSET_OR_BOTH = "noupset"; // Change this to "upset" to only bet on upsets, "noupset" to avoid betting on upsets

let bankroll: number = 0;
let numberOfBets: number = 0;
let numberOfBetsWon: number = 0;

const betAmountToWin = (betAmount: number, moneyLine: number): number => {
  let winnings: number;
  if (moneyLine > 0) {
    winnings = (betAmount * moneyLine) / 100;
  } else {
    winnings = (betAmount * 100) / Math.abs(moneyLine);
  }
  return parseFloat(winnings.toFixed(2));
};

const shouldBet = (isAway: boolean, impliedProbability: number, predictedProbability: number, moneyLine: number): boolean => {
  // @ts-ignore
  if (awayOrHomeOrBoth === "away" && !isAway) {
    return false; // Only bet on away teams
  }

  // @ts-ignore
  if (awayOrHomeOrBoth === "home" && isAway) {
    return false; // Only bet on home teams
  }

  const isUpset = predictedProbability > 50 && impliedProbability < 50;

  // @ts-ignore
  if (betUpset === "upset" && !isUpset) {
    return false; // Only bet on upsets if we're allowed to
  }

  // @ts-ignore
  if (betUpset === "noupset" && isUpset) {
    return false; // Don't bet on upsets if we're avoiding them
  }

  const discrepancy: number = predictedProbability - impliedProbability;

  // @ts-ignore
  if (favOrDogOrBoth === "favorite" && moneyLine > 0) {
    return false; // Don't bet on underdogs if we're only betting favorites
  }

  // @ts-ignore
  if (favOrDogOrBoth === "underdog" && moneyLine < 0) {
    return false; // Don't bet on favorites if we're only betting underdogs
  }

  return discrepancy >= DISCREPENCY_THRESHOLD && discrepancy > 0;
};

const analzyeGame = async (league: League, eventId: string): Promise<void> => {
  const {
    awayImpliedProbability,
    homeImpliedProbability,
    awayTeamWon,
    homeTeamWon,
    awayMoneyLine,
    homeMoneyLine,
  }: {
    awayImpliedProbability: number;
    homeImpliedProbability: number;
    awayTeamWon: boolean;
    homeTeamWon: boolean;
    awayMoneyLine: number;
    homeMoneyLine: number;
  } = await getOdds(league, eventId);

  console.log("Moneyline: ", awayMoneyLine, homeMoneyLine);
  console.log("Implied:", awayImpliedProbability, homeImpliedProbability);

  const {
    awayTeamPredictedProbability,
    homeTeamPredictedProbability,
  }: {
    awayTeamPredictedProbability: number;
    homeTeamPredictedProbability: number;
  } = await getPredictedProbability(league, eventId);

  console.log("Predicted:", awayTeamPredictedProbability, homeTeamPredictedProbability);

  const shouldBetAway = shouldBet(true, awayImpliedProbability, awayTeamPredictedProbability, awayMoneyLine);
  const shouldBetHome = shouldBet(false, homeImpliedProbability, homeTeamPredictedProbability, homeMoneyLine);

  console.log("Should bet:", shouldBetAway, shouldBetHome);

  if (shouldBetAway || shouldBetHome) {
    numberOfBets++;
  }

  if (shouldBetAway) {
    if (awayTeamWon) {
      const winAmount: number = betAmountToWin(BET_AMOUNT, awayMoneyLine);
      bankroll += winAmount;
      numberOfBetsWon++;
      console.log("Away team won! Bankroll increased by:", winAmount);
    } else {
      bankroll -= BET_AMOUNT;
      console.log("Away team lost! Bankroll decreased by bet amount.");
    }
  } else if (shouldBetHome) {
    if (homeTeamWon) {
      const winAmount: number = betAmountToWin(BET_AMOUNT, homeMoneyLine);
      bankroll += winAmount;
      numberOfBetsWon++;
      console.log("Home team won! Bankroll increased by:", winAmount);
    } else {
      bankroll -= BET_AMOUNT;
      console.log("Home team lost! Bankroll decreased by bet amount.");
    }
  }
};

(async (): Promise<void> => {
  await initCache();
  const startingGameId: string = "401705636";

  for (let i: number = 0; i < 1000; i++) {
    const gameId: number = parseInt(startingGameId) - i;
    console.log(`Game ${gameId}`);
    try {
      await analzyeGame("nba", gameId.toString());
      //   await wait(750);
    } catch (error: unknown) {
      console.error("Error analyzing game:", error);
    }
    console.log("Current bankroll:", bankroll.toFixed(2));
    console.log("---------------------");
  }

  console.log("Away or Home:", awayOrHomeOrBoth);
  console.log("Favorite or Underdog:", favOrDogOrBoth);
  console.log("Discrepancy threshold:", DISCREPENCY_THRESHOLD);
  console.log("Betting upsets?", betUpset);
  console.log("Final bankroll:", bankroll.toFixed(2));
  console.log("Number of bets placed:", numberOfBets);
  console.log("Number of bets won:", numberOfBetsWon);
  const totalBet = numberOfBets * BET_AMOUNT;
  const roi = ((bankroll / totalBet) * 100).toFixed(2);
  console.log("ROI:", roi, "%");
})();
