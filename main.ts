import { initCache } from "./cache";
import { getOdds, getPredictedProbability, getResults, League } from "./espn";
import {
  DISCREPENCY_THRESHOLD,
  BET_AMOUNT,
  NUMBER_OF_GAMES_TO_ANALYZE,
  awayOrHomeOrBoth,
  favOrDogOrBoth,
  betUpset,
  //   SKIP_CACHE,
  LEAGUE,
  STARTING_GAME_ID,
} from "./settings";
import { wait } from "./utils";

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
  if (awayOrHomeOrBoth === "away" && !isAway) {
    return false; // Only bet on away teams
  }

  if (awayOrHomeOrBoth === "home" && isAway) {
    return false; // Only bet on home teams
  }

  const isUpset = predictedProbability > 50 && impliedProbability < 50;

  if (betUpset === "upset" && !isUpset) {
    return false; // Only bet on upsets if we're allowed to
  }

  if (betUpset === "noupset" && isUpset) {
    return false; // Don't bet on upsets if we're avoiding them
  }

  const discrepancy: number = predictedProbability - impliedProbability;

  if (favOrDogOrBoth === "favorite" && moneyLine > 0) {
    return false; // Don't bet on underdogs if we're only betting favorites
  }

  if (favOrDogOrBoth === "underdog" && moneyLine < 0) {
    return false; // Don't bet on favorites if we're only betting underdogs
  }

  return discrepancy >= DISCREPENCY_THRESHOLD && discrepancy > 0;
};

const analyzeGame = async (league: League, eventId: string): Promise<void> => {
  const { awayImpliedProbability, homeImpliedProbability, awayMoneyLine, homeMoneyLine } = await getOdds(league, eventId);
  console.log("Moneyline: ", awayMoneyLine, homeMoneyLine);
  console.log("Implied:", awayImpliedProbability, homeImpliedProbability);

  const { awayTeamPredictedProbability, homeTeamPredictedProbability } = await getPredictedProbability(league, eventId);
  console.log("Predicted:", awayTeamPredictedProbability, homeTeamPredictedProbability);

  const shouldBetAway = shouldBet(true, awayImpliedProbability, awayTeamPredictedProbability, awayMoneyLine);
  const shouldBetHome = shouldBet(false, homeImpliedProbability, homeTeamPredictedProbability, homeMoneyLine);
  console.log("Should bet:", shouldBetAway, shouldBetHome);

  if (shouldBetAway || shouldBetHome) {
    numberOfBets++;
  }

  const { awayTeamWon, homeTeamWon } = await getResults(league, eventId);

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
  const startingGameId: string = STARTING_GAME_ID;

  for (let i: number = 0; i < NUMBER_OF_GAMES_TO_ANALYZE; i++) {
    const gameId: number = parseInt(startingGameId) - i;
    console.log(`Game ${gameId}`);
    try {
      //   if (SKIP_CACHE) {
      //   await wait(250);
      //   }

      await analyzeGame(LEAGUE, gameId.toString());
    } catch (error: unknown) {
      console.error("Error analyzing game:", error);
    }
    console.log("Current bankroll:", bankroll.toFixed(2));
    console.log("---------------------");
  }

  const totalBet = numberOfBets * BET_AMOUNT;
  const roi = ((bankroll / totalBet) * 100).toFixed(2);

  console.log("Away or Home:", awayOrHomeOrBoth);
  console.log("Favorite or Underdog:", favOrDogOrBoth);
  console.log("Discrepancy threshold:", DISCREPENCY_THRESHOLD);
  console.log("Betting upsets?", betUpset);
  console.log("Final bankroll:", bankroll.toFixed(2));
  console.log("Number of bets placed:", numberOfBets);
  console.log("Number of bets won:", numberOfBetsWon);
  console.log("ROI:", roi, "%");
})();
