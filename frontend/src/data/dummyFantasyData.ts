type Position = "G" | "F" | "C";

type Game = {
  date: string;
  pointsScored: number;
};

type Player = {
  id: number;
  name: string;
  positions: Position[];
  seasonAvgPoints: number;
  rolling30DayAvgPoints: number;
  games: Game[];
};

type DummyFantasyData = {
  roster: Player[];
  availablePlayers: Player[];
};

type PlayerTier = "star" | "starter" | "bench";

type BasePlayer = {
  id: number;
  name: string;
  positions: Position[];
  tier: PlayerTier;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const createSeededRng = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const roundToOne = (value: number) => Math.round(value * 10) / 10;

const randomBetween = (rng: () => number, min: number, max: number) =>
  min + (max - min) * rng();

const randomInt = (rng: () => number, min: number, maxInclusive: number) =>
  Math.floor(randomBetween(rng, min, maxInclusive + 1));

const shuffle = <T,>(items: T[], rng: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const getTierAverages = (tier: PlayerTier, rng: () => number) => {
  let seasonMin = 0;
  let seasonMax = 0;
  switch (tier) {
    case "star":
      seasonMin = 28;
      seasonMax = 42;
      break;
    case "starter":
      seasonMin = 18;
      seasonMax = 28;
      break;
    case "bench":
      seasonMin = 6;
      seasonMax = 18;
      break;
    default:
      seasonMin = 12;
      seasonMax = 22;
  }

  const seasonAvg = roundToOne(randomBetween(rng, seasonMin, seasonMax));
  let rollingAvg = roundToOne(seasonAvg + randomBetween(rng, -4, 4));
  if (Math.abs(rollingAvg - seasonAvg) < 0.1) {
    rollingAvg = roundToOne(seasonAvg + 0.6);
  }

  return { seasonAvg, rollingAvg };
};

const buildDates = (days: number) => {
  const today = new Date();
  const startUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(startUtc.getTime() + index * MILLISECONDS_PER_DAY);
    return date.toISOString().slice(0, 10);
  });
};

const buildGames = (
  playerId: number,
  rollingAvg: number,
  tier: PlayerTier,
  dates: string[]
) => {
  const rng = createSeededRng(playerId * 941);
  const varianceByTier: Record<PlayerTier, number> = {
    star: 8,
    starter: 6,
    bench: 4,
  };

  const weekLengths = [7, 7, 7, 7, 2];
  let dayIndex = 0;
  const games: Game[] = [];

  weekLengths.forEach((weekLength, weekIndex) => {
    const weekRng = createSeededRng(playerId * 101 + weekIndex * 37);
    const gameCount = Math.min(2 + randomInt(weekRng, 0, 2), weekLength);
    const dayOffsets = shuffle(
      Array.from({ length: weekLength }, (_, i) => i),
      weekRng
    ).slice(0, gameCount);

    dayOffsets.forEach((offset) => {
      const date = dates[dayIndex + offset];
      const variance = varianceByTier[tier];
      const jitter = (rng() - 0.5) * variance * 2 + (rng() - 0.5) * variance;
      const pointsScored = Math.max(0, roundToOne(rollingAvg + jitter));
      games.push({ date, pointsScored });
    });

    dayIndex += weekLength;
  });

  return games.sort((a, b) => a.date.localeCompare(b.date));
};

const rosterBase: BasePlayer[] = [
  { id: 1001, name: "Ariel Atkins", positions: ["G"], tier: "starter" },
  { id: 1002, name: "Rachel Banham", positions: ["G"], tier: "bench" },
  { id: 1003, name: "Satou Sabally", positions: ["F", "C"], tier: "star" },
  { id: 1004, name: "Natasha Howard", positions: ["F", "C"], tier: "starter" },
  { id: 1005, name: "Gabby Williams", positions: ["F"], tier: "starter" },
  { id: 1006, name: "Julie Allemand", positions: ["G"], tier: "starter" },
  { id: 1007, name: "Sabrina Ionescu", positions: ["G"], tier: "star" },
  { id: 1008, name: "Leila Lacan", positions: ["G"], tier: "bench" },
  { id: 1009, name: "Emily Engstler", positions: ["F"], tier: "starter" },
];

const availableBase: BasePlayer[] = [
  { id: 2001, name: "Alyssa Thomas", positions: ["F"], tier: "star" },
  { id: 2002, name: "Breanna Stewart", positions: ["F"], tier: "star" },
  { id: 2003, name: "A'ja Wilson", positions: ["F", "C"], tier: "star" },
  { id: 2004, name: "Napheesa Collier", positions: ["F"], tier: "star" },
  { id: 2005, name: "Jonquel Jones", positions: ["C"], tier: "star" },
  { id: 2006, name: "Kelsey Plum", positions: ["G"], tier: "star" },
  { id: 2007, name: "Chelsea Gray", positions: ["G"], tier: "star" },
  { id: 2008, name: "Diana Taurasi", positions: ["G"], tier: "starter" },
  { id: 2009, name: "Skylar Diggins-Smith", positions: ["G"], tier: "starter" },
  { id: 2010, name: "Jackie Young", positions: ["G"], tier: "starter" },
  { id: 2011, name: "Arike Ogunbowale", positions: ["G"], tier: "star" },
  { id: 2012, name: "Kayla McBride", positions: ["G"], tier: "starter" },
  { id: 2013, name: "Allisha Gray", positions: ["G"], tier: "starter" },
  { id: 2014, name: "Jewell Loyd", positions: ["G"], tier: "star" },
  { id: 2015, name: "Natasha Cloud", positions: ["G"], tier: "starter" },
  { id: 2016, name: "Erica Wheeler", positions: ["G"], tier: "bench" },
  { id: 2017, name: "Aari McDonald", positions: ["G"], tier: "bench" },
  { id: 2018, name: "Sophie Cunningham", positions: ["G"], tier: "bench" },
  { id: 2019, name: "Marine Johannes", positions: ["G"], tier: "bench" },
  { id: 2020, name: "Odyssey Sims", positions: ["G"], tier: "bench" },
  { id: 2021, name: "Dearica Hamby", positions: ["F"], tier: "starter" },
  { id: 2022, name: "Elena Delle Donne", positions: ["F"], tier: "star" },
  { id: 2023, name: "Brionna Jones", positions: ["C"], tier: "starter" },
  { id: 2024, name: "Brittney Griner", positions: ["C"], tier: "star" },
  { id: 2025, name: "Teaira McCowan", positions: ["C"], tier: "starter" },
  { id: 2026, name: "Aliyah Boston", positions: ["C"], tier: "star" },
  { id: 2027, name: "Ezi Magbegor", positions: ["C"], tier: "starter" },
  { id: 2028, name: "Cheyenne Parker", positions: ["F", "C"], tier: "starter" },
  { id: 2029, name: "Nneka Ogwumike", positions: ["F"], tier: "star" },
  { id: 2030, name: "Emma Meesseman", positions: ["F", "C"], tier: "star" },
  { id: 2031, name: "Ariel Powers", positions: ["F"], tier: "bench" },
  { id: 2032, name: "Kiah Stokes", positions: ["C"], tier: "bench" },
  { id: 2033, name: "Tianna Hawkins", positions: ["F", "C"], tier: "bench" },
  { id: 2034, name: "Naz Hillmon", positions: ["F"], tier: "bench" },
  { id: 2035, name: "Sami Whitcomb", positions: ["G"], tier: "bench" },
  { id: 2036, name: "Crystal Dangerfield", positions: ["G"], tier: "bench" },
  { id: 2037, name: "Jordin Canada", positions: ["G"], tier: "starter" },
  { id: 2038, name: "Courtney Williams", positions: ["G"], tier: "starter" },
  { id: 2039, name: "Brittney Sykes", positions: ["G"], tier: "starter" },
  { id: 2040, name: "Riquna Williams", positions: ["G"], tier: "bench" },
  { id: 2041, name: "Theresa Plaisance", positions: ["C"], tier: "bench" },
  { id: 2042, name: "Tina Charles", positions: ["C"], tier: "starter" },
  { id: 2043, name: "Kierstan Bell", positions: ["G"], tier: "bench" },
  { id: 2044, name: "Diamond DeShields", positions: ["F"], tier: "starter" },
  { id: 2045, name: "Shatori Walker-Kimbrough", positions: ["G"], tier: "bench" },
  { id: 2046, name: "Betnijah Laney-Hamilton", positions: ["F"], tier: "starter" },
  { id: 2047, name: "NaLyssa Smith", positions: ["F"], tier: "starter" },
  { id: 2048, name: "Isabelle Harrison", positions: ["F", "C"], tier: "bench" },
  { id: 2049, name: "Dorka Juhasz", positions: ["C"], tier: "starter" },
  { id: 2050, name: "Kayla Thornton", positions: ["F"], tier: "starter" },
];

const buildPlayer = (base: BasePlayer, dates: string[]): Player => {
  const rng = createSeededRng(base.id * 37);
  const { seasonAvg, rollingAvg } = getTierAverages(base.tier, rng);
  return {
    id: base.id,
    name: base.name,
    positions: base.positions,
    seasonAvgPoints: seasonAvg,
    rolling30DayAvgPoints: rollingAvg,
    games: buildGames(base.id, rollingAvg, base.tier, dates),
  };
};

const dates = buildDates(30);

export const dummyFantasyData: DummyFantasyData = {
  roster: rosterBase.map((player) => buildPlayer(player, dates)),
  availablePlayers: availableBase.map((player) => buildPlayer(player, dates)),
};
