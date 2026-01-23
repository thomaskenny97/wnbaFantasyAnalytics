import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Player } from "../models/types.js";

type PlayersDataFile = {
  players: Player[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playersDataPath = path.resolve(__dirname, "..", "..", "data", "players.json");

export const getAllPlayers = (): Player[] => {
  const raw = readFileSync(playersDataPath, "utf-8");
  const data = JSON.parse(raw) as PlayersDataFile;
  return data.players;
};
