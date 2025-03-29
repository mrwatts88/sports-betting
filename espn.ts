import { getCachedData, saveToCache } from "./cache";

const BASE_URL: string = "https://sports.core.api.espn.com/v2";
const API_BASE_URL: string = "https://site.api.espn.com/apis/site/v2";

export type League = "nba" | "nfl" | "mlb" | "nhl";
export type Sport = "basketball" | "football" | "baseball" | "icehockey";

const leagueToSport = (league: League): Sport => {
  switch (league) {
    case "nba":
      return "basketball";
    case "nfl":
      return "football";
    case "mlb":
      return "baseball";
    case "nhl":
      return "icehockey";
    default:
      throw new Error(`Unsupported league: ${league}`);
  }
};

const summaryUrl = (league: League, eventId: string): string => {
  return `${API_BASE_URL}/sports/${leagueToSport(league)}/${league}/summary?event=${eventId}`;
};

const competitionsUrl = (league: League, eventId: string): string => {
  return `${BASE_URL}/sports/${leagueToSport(league)}/leagues/${league}/events/${eventId}/competitions/${eventId}`;
};

export const oddsUrl = (league: League, eventId: string): string => `${competitionsUrl(league, eventId)}/odds`;

export const predictionUrl = (league: League, eventId: string): string => `${competitionsUrl(league, eventId)}/predictor`;

const oddsToImpliedProbability = (moneyLine: number): number => {
  if (moneyLine < 0) {
    return parseFloat(((-moneyLine / (-moneyLine + 100)) * 100).toFixed(3));
  } else {
    return parseFloat(((100 / (moneyLine + 100)) * 100).toFixed(3));
  }
};

export const getOdds = async (
  league: League,
  eventId: string
): Promise<{
  awayMoneyLine: number;
  homeMoneyLine: number;
  awayImpliedProbability: number;
  homeImpliedProbability: number;
  //   awayTeamWon: boolean;
  //   homeTeamWon: boolean;
}> => {
  const cacheKey = `odds_${league}_${eventId}`;
  const cachedData = await getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const url: string = oddsUrl(league, eventId);
  const response: Response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch odds: ${response.statusText}`);
  }

  const data: any = await response.json();
  const item: any = data.items.find((item: any) => item.provider.name === "ESPN BET");

  if (!item) {
    throw new Error("No odds data found for ESPN BET");
  }

  const awayMoneyLine: number = item.awayTeamOdds?.moneyLine;
  const homeMoneyLine: number = item.homeTeamOdds?.moneyLine;

  if (awayMoneyLine === undefined || homeMoneyLine === undefined) {
    throw new Error("Money line odds are not available");
  }

  const awayImpliedProbability: number = oddsToImpliedProbability(awayMoneyLine);
  const homeImpliedProbability: number = oddsToImpliedProbability(homeMoneyLine);

  //   const awayTeamMoneyLineOutcome: string | undefined = item.awayTeamOdds?.current?.moneyLine?.outcome?.type;
  //   const homeTeamMoneyLineOutcome: string | undefined = item.homeTeamOdds?.current?.moneyLine?.outcome?.type;

  //   if (awayTeamMoneyLineOutcome === undefined || homeTeamMoneyLineOutcome === undefined) {
  //     throw new Error("Money line outcome is not available");
  //   }

  //   const awayTeamWon: boolean = awayTeamMoneyLineOutcome === "win";
  //   const homeTeamWon: boolean = homeTeamMoneyLineOutcome === "win";

  const result = {
    awayMoneyLine,
    homeMoneyLine,
    awayImpliedProbability,
    homeImpliedProbability,
    // awayTeamWon,
    // homeTeamWon,
  };

  await saveToCache(cacheKey, result);
  return result;
};

export const getPredictedProbability = async (
  league: League,
  eventId: string
): Promise<{
  awayTeamPredictedProbability: number;
  homeTeamPredictedProbability: number;
}> => {
  const cacheKey = `prediction_${league}_${eventId}`;
  const cachedData = await getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const url: string = predictionUrl(league, eventId);
  const response: Response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch predicted probability: ${response.statusText}`);
  }

  const data: any = await response.json();

  const awayTeamPredictedProbability: number | undefined = data.awayTeam.statistics.find((stat: any) => stat.name === "gameProjection")?.value;
  if (awayTeamPredictedProbability === undefined) {
    throw new Error("Away team predicted probability is not available");
  }

  const homeTeamPredictedProbability: number | undefined = data.awayTeam.statistics.find((stat: any) => stat.name === "teamChanceLoss")?.value;
  if (homeTeamPredictedProbability === undefined) {
    throw new Error("Home team predicted probability is not available");
  }

  const result = {
    awayTeamPredictedProbability: parseFloat(awayTeamPredictedProbability.toFixed(3)),
    homeTeamPredictedProbability: parseFloat(homeTeamPredictedProbability.toFixed(3)),
  };

  await saveToCache(cacheKey, result);
  return result;
};

export const getResults = async (
  league: League,
  eventId: string
): Promise<{
  awayTeamWon: boolean;
  homeTeamWon: boolean;
}> => {
  const cacheKey = `results_${league}_${eventId}`;
  const cachedData = await getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const url: string = summaryUrl(league, eventId);
  const response: Response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch game summary: ${response.statusText}`);
  }

  const data: any = await response.json();
  const competitors = data.header.competitions[0].competitors;
  const awayTeam = competitors.find((team: any) => team.homeAway === "away");
  const homeTeam = competitors.find((team: any) => team.homeAway === "home");

  if (!awayTeam) {
    throw new Error("Away team not found in the game summary");
  }

  if (!homeTeam) {
    throw new Error("Home team not found in the game summary");
  }

  const awayTeamWon: boolean = awayTeam.winner === true;
  const homeTeamWon: boolean = !awayTeamWon;

  const result = {
    awayTeamWon,
    homeTeamWon,
  };

  await saveToCache(cacheKey, result);
  return result;
};
