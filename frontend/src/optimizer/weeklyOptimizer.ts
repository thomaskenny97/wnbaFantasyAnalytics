export type Game = {
  date: string;
  pointsScored: number;
};

export type Player = {
  id: number;
  name: string;
  positions: Array<"G" | "F" | "C">;
  seasonAvgPoints: number;
  rolling30DayAvgPoints: number;
  games: Game[];
};

export type OptimizationInput = {
  roster: Player[];
  startDate: string;
  endDate: string;
  scoringMethod: "SEASON_AVERAGE" | "ROLLING_30";
};

export type DailyLineup = {
  date: string;
  starters: Player[];
  totalPoints: number;
};

export type OptimizationResult = {
  dailyLineups: DailyLineup[];
  totalPoints: number;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const toIsoDate = (value: string) => new Date(value).toISOString().slice(0, 10);

const buildDateRange = (startDate: string, endDate: string) => {
  const start = new Date(`${toIsoDate(startDate)}T00:00:00Z`);
  const end = new Date(`${toIsoDate(endDate)}T00:00:00Z`);
  if (end < start) {
    return [];
  }

  const days: string[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += MILLISECONDS_PER_DAY) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
};

const getExpectedPoints = (
  player: Player,
  date: string,
  scoringMethod: OptimizationInput["scoringMethod"]
) => {
  const game = player.games.find((entry) => entry.date === date);
  if (game) {
    return game.pointsScored;
  }
  return scoringMethod === "ROLLING_30" ? player.rolling30DayAvgPoints : player.seasonAvgPoints;
};

const isEligibleForSlot = (player: Player, slot: "G" | "FC" | "UTIL") => {
  if (slot === "UTIL") {
    return true;
  }
  if (slot === "G") {
    return player.positions.includes("G");
  }
  return player.positions.includes("F") || player.positions.includes("C");
};

const canFillLineup = (players: Player[]) => {
  const slots: Array<"G" | "FC" | "UTIL"> = ["G", "G", "FC", "FC", "FC", "UTIL"];

  const backtrack = (slotIndex: number, remaining: Player[]) => {
    if (slotIndex >= slots.length) {
      return true;
    }
    const slot = slots[slotIndex];
    for (let i = 0; i < remaining.length; i += 1) {
      const player = remaining[i];
      if (!isEligibleForSlot(player, slot)) {
        continue;
      }
      const nextRemaining = remaining.filter((_, idx) => idx !== i);
      if (backtrack(slotIndex + 1, nextRemaining)) {
        return true;
      }
    }
    return false;
  };

  return backtrack(0, players);
};

const pickBestLineup = (
  eligiblePlayers: Player[],
  date: string,
  scoringMethod: OptimizationInput["scoringMethod"]
) => {
  if (eligiblePlayers.length <= 6) {
    const totalPoints = eligiblePlayers.reduce(
      (sum, player) => sum + getExpectedPoints(player, date, scoringMethod),
      0
    );
    return { starters: eligiblePlayers, totalPoints };
  }

  let bestStarters: Player[] = [];
  let bestPoints = -Infinity;
  const targetSize = 6;
  const totalPlayers = eligiblePlayers.length;

  const combine = (startIndex: number, current: Player[]) => {
    if (current.length === targetSize) {
      if (!canFillLineup(current)) {
        return;
      }
      const totalPoints = current.reduce(
        (sum, player) => sum + getExpectedPoints(player, date, scoringMethod),
        0
      );
      if (totalPoints > bestPoints) {
        bestPoints = totalPoints;
        bestStarters = [...current];
      }
      return;
    }

    for (let i = startIndex; i < totalPlayers; i += 1) {
      current.push(eligiblePlayers[i]);
      combine(i + 1, current);
      current.pop();
    }
  };

  combine(0, []);
  return { starters: bestStarters, totalPoints: bestPoints };
};

export function optimizeWeeklyLineup(input: OptimizationInput): OptimizationResult {
  const dates = buildDateRange(input.startDate, input.endDate);
  const dailyLineups: DailyLineup[] = [];

  for (const date of dates) {
    const eligiblePlayers = input.roster.filter((player) =>
      player.games.some((game) => game.date === date)
    );
    const { starters, totalPoints } = pickBestLineup(
      eligiblePlayers,
      date,
      input.scoringMethod
    );

    dailyLineups.push({
      date,
      starters,
      totalPoints,
    });
  }

  const totalPoints = dailyLineups.reduce((sum, day) => sum + day.totalPoints, 0);
  return { dailyLineups, totalPoints };
}
