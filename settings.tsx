import { League } from "./espn";

export type FAV_OR_DOG_OR_BOTH = "favorite" | "underdog" | "both";
export type AWAY_OR_HOME_OR_BOTH = "away" | "home" | "both";
export type UPSET_OR_NOUPSET_OR_BOTH = "upset" | "noupset" | "both";

export const LEAGUE: League = "nba";
export const YEAR: number = 2023;
export const DISCREPENCY_THRESHOLD: number = 5;
export const BET_AMOUNT: number = 100;
export const NUMBER_OF_GAMES_TO_ANALYZE: number = 1000;
export const SKIP_CACHE: boolean = false;
export const favOrDogOrBoth: FAV_OR_DOG_OR_BOTH = "underdog";
export const awayOrHomeOrBoth: AWAY_OR_HOME_OR_BOTH = "away";
export const betUpset: UPSET_OR_NOUPSET_OR_BOTH = "noupset";

export const STARTING_GAME_ID = ((): string => {
  if (LEAGUE === "nba") {
    if (YEAR === 2025) {
      return "401705636";
    } else if (YEAR === 2024) {
      return "401585814";
    } else if (YEAR === 2023) {
      return "401469371";
    }
  }
  throw new Error(`Unsupported league or year: ${LEAGUE} ${YEAR}`);
})();
