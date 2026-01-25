import express from "express";
import cors from "cors";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getAllPlayers } from "./repositories/playersRepository.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/players", (_req, res) => {
  const players = getAllPlayers();
  res.json(players);
});

app.get("/api/espn/test", async (_req, res) => {
  // Build the ESPN league endpoint for the WNBA fantasy API.
  const leagueId = 133498200;
  const seasonId = 2025;
  const gameKey = "wnba";
  const url = `https://fantasy.espn.com/apis/v3/games/${gameKey}/seasons/${seasonId}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings`;

  // Read auth cookies from environment variables and send as a Cookie header.
  const espnS2 = process.env.ESPN_S2;
  const swid = process.env.SWID;
  // Diagnostic: confirm env vars are present without logging secrets.
  console.log("ESPN env vars loaded", {
    hasEspnS2: Boolean(espnS2),
    hasSwid: Boolean(swid),
  });
  if (!espnS2 || !swid) {
    res.status(500).json({ error: "Missing ESPN auth cookies in environment." });
    return;
  }

  try {
    const requestHeaders: Record<string, string> = {
      // Cookie must be formatted exactly as required by ESPN auth.
      Cookie: `espn_s2=${espnS2}; SWID=${swid}`,
      // Browser-like headers to reduce chance of HTML login responses.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Referer: "https://fantasy.espn.com/",
      Origin: "https://fantasy.espn.com",
      // NOTE: Browsers also send sec-fetch-* and sec-ch-ua headers;
      // Node fetch does not include these by default.
    };

    // Diagnostic: log headers with cookies redacted to compare vs browser.
    const redactedHeaders = {
      ...requestHeaders,
      Cookie: "espn_s2=[REDACTED]; SWID=[REDACTED]",
    };
    console.log("ESPN request headers", redactedHeaders);

    const response = await fetch(url, {
      headers: requestHeaders,
      // Allow redirects and log if ESPN redirects to an HTML login page.
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = await response.text();
    if (response.status >= 300 && response.status < 400) {
      console.warn("ESPN redirect detected", {
        status: response.status,
        responseUrl: response.url,
      });
    }

    if (!response.ok) {
      console.error("ESPN request failed", {
        status: response.status,
        statusText: response.statusText,
        responseUrl: response.url,
        contentType,
        bodyPreview: rawBody.slice(0, 300),
      });
      const outputPath = path.resolve(__dirname, "..", "data", "espn-league-raw.json");
      writeFileSync(
        outputPath,
        JSON.stringify({ contentType, body: rawBody }, null, 2),
        "utf-8"
      );
      res.status(500).json({ error: "ESPN request failed. Check server logs." });
      return;
    }

    if (!contentType.includes("application/json")) {
      console.error("ESPN response was not JSON", {
        status: response.status,
        responseUrl: response.url,
        contentType,
        bodyPreview: rawBody.slice(0, 300),
      });
      const outputPath = path.resolve(__dirname, "..", "data", "espn-league-raw.json");
      // Diagnostic: save raw HTML for inspection when JSON is not returned.
      writeFileSync(
        outputPath,
        JSON.stringify({ contentType, body: rawBody }, null, 2),
        "utf-8"
      );
      res.status(500).json({ error: "ESPN response was not JSON. Check server logs." });
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("Failed to parse ESPN JSON", {
        error: parseError,
        bodyPreview: rawBody.slice(0, 300),
      });
      res.status(500).json({ error: "Failed to parse ESPN JSON. Check server logs." });
      return;
    }

    console.log("ESPN JSON response received", {
      status: response.status,
      responseUrl: response.url,
    });

    // Save the full raw response to disk for inspection.
    const outputPath = path.resolve(__dirname, "..", "data", "espn-league-raw.json");
    writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");

    // Return only a minimal subset to confirm connectivity and auth.
    const responseData = data as {
      settings?: { name?: string };
      name?: string;
      teams?: unknown[];
      seasonId?: number;
    };
    const leagueName = responseData?.settings?.name ?? responseData?.name ?? "Unknown League";
    const teamCount = Array.isArray(responseData?.teams) ? responseData.teams.length : 0;
    res.json({ leagueName, seasonId: responseData?.seasonId ?? seasonId, teamCount });
  } catch (error) {
    console.error("ESPN request error", error);
    res.status(500).json({ error: "Failed to reach ESPN Fantasy API." });
  }
});

type EspnPublicLeagueResponse = {
  scoringPeriodId?: number;
  teams?: Array<{
    id: number;
    name?: string;
    roster?: {
      entries?: Array<{
        playerId?: number;
        status?: string;
        playerPoolEntry?: {
          player?: {
            id?: number;
            fullName?: string;
            firstName?: string;
            lastName?: string;
            defaultPositionId?: number;
            eligibleSlots?: number[];
            injuryStatus?: string;
            ownership?: {
              percentOwned?: number;
            };
            stats?: Array<{
              seasonId?: number;
              scoringPeriodId?: number;
              statSourceId?: number;
              appliedTotal?: number;
              appliedAverage?: number;
            }>;
          };
        };
      }>;
    };
  }>;
};

type EspnPlayerStatsEntry = {
  player?: {
    id?: number;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    defaultPositionId?: number;
    eligibleSlots?: number[];
    injuryStatus?: string;
    ownership?: {
      percentOwned?: number;
    };
  };
  stats?: Array<{
    scoringPeriodId?: number;
    statSourceId?: number;
    appliedTotal?: number;
    appliedAverage?: number;
  }>;
};

type EspnPlayerWithStats = {
  id?: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  defaultPositionId?: number;
  eligibleSlots?: number[];
  injuryStatus?: string;
  ownership?: {
    percentOwned?: number;
  };
  stats?: EspnPlayerStatsEntry["stats"];
};

type EspnKonaPlayerInfoResponse = {
  players?: Array<{
    id?: number;
    onTeamId?: number;
    player?: EspnPlayerWithStats;
  }>;
};

app.get("/api/espn/public/players", async (_req, res) => {
  const url =
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/wfba/seasons/2025/players?scoringPeriodId=0&view=players_wl";

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.error("Public players request failed", {
        status: response.status,
        statusText: response.statusText,
        responseUrl: response.url,
      });
      res.status(500).json({ error: "Failed to fetch public players." });
      return;
    }

    const data = (await response.json()) as unknown;
    res.json(data);
  } catch (error) {
    console.error("Public players request error", error);
    res.status(500).json({ error: "Failed to reach public players endpoint." });
  }
});

app.get("/api/espn/public/league", async (_req, res) => {
  const url =
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/wfba/seasons/2025/segments/0/leagues/133498200?view=mTeam&view=mRoster&view=mSettings";

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.error("Public league request failed", {
        status: response.status,
        statusText: response.statusText,
        responseUrl: response.url,
      });
      res.status(500).json({ error: "Failed to fetch public league." });
      return;
    }

    const raw = (await response.json()) as EspnPublicLeagueResponse;
    const outputPath = path.resolve(__dirname, "..", "data", "espn-league-public.json");
    writeFileSync(outputPath, JSON.stringify(raw, null, 2), "utf-8");

    res.json(raw.teams ?? []);
  } catch (error) {
    console.error("Public league request error", error);
    res.status(500).json({ error: "Failed to reach public league endpoint." });
  }
});

app.get("/api/espn/public/my-roster", async (_req, res) => {
  const url =
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/wfba/seasons/2025/segments/0/leagues/133498200?view=mTeam&view=mRoster&view=mSettings";

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.error("Public roster request failed", {
        status: response.status,
        statusText: response.statusText,
        responseUrl: response.url,
      });
      res.status(500).json({ error: "Failed to fetch public roster." });
      return;
    }

    const data = (await response.json()) as EspnPublicLeagueResponse;
    const team = data.teams?.find((entry) => entry.id === 10);
    const rosterEntries = team?.roster?.entries ?? [];
    const rosterPlayers = rosterEntries
      .map((entry) => entry.playerPoolEntry?.player)
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
    res.json(rosterPlayers);
  } catch (error) {
    console.error("Public roster request error", error);
    res.status(500).json({ error: "Failed to reach public roster endpoint." });
  }
});

app.get("/api/espn/public/roster-rolling", async (_req, res) => {
  const leagueUrl =
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/wfba/seasons/2025/segments/0/leagues/133498200?view=mTeam&view=mRoster&view=mSettings";

  try {
    const leagueResponse = await fetch(leagueUrl, {
      headers: { Accept: "application/json" },
    });
    if (!leagueResponse.ok) {
      console.error("Public rolling request failed (league)", {
        status: leagueResponse.status,
        statusText: leagueResponse.statusText,
        responseUrl: leagueResponse.url,
      });
      res.status(500).json({ error: "Failed to fetch league data." });
      return;
    }

    const leagueData = (await leagueResponse.json()) as EspnPublicLeagueResponse;
    const currentPeriodId = leagueData.scoringPeriodId ?? 0;
    const team = leagueData.teams?.find((entry) => entry.id === 10);
    const rosterEntries = team?.roster?.entries ?? [];
    const rosterPlayers = rosterEntries
      .map((entry) => entry.playerPoolEntry?.player)
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
    const rosterIds = new Set(rosterPlayers.map((player) => player.id).filter(Boolean));

    const fetchPeriodTotals = async (periodId: number) => {
      const url =
        `https://lm-api-reads.fantasy.espn.com/apis/v3/games/wfba/seasons/2025/players` +
        `?scoringPeriodId=${periodId}&view=players_wl`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        console.error("Public rolling request failed (players)", {
          periodId,
          status: response.status,
          statusText: response.statusText,
          responseUrl: response.url,
        });
        return new Map<number, number>();
      }

      const data = (await response.json()) as EspnPlayerStatsEntry[];
      const totals = new Map<number, number>();
      for (const entry of data) {
        const playerId = entry.player?.id;
        if (!playerId || !rosterIds.has(playerId)) {
          continue;
        }
        // ESPN includes multiple stat sources; statSourceId=0 is actuals.
        const stat = entry.stats?.find(
          (s) => s.scoringPeriodId === periodId && s.statSourceId === 0
        );
        if (stat?.appliedTotal !== undefined) {
          totals.set(playerId, stat.appliedTotal);
        }
      }
      return totals;
    };

    const last7 = Array.from({ length: 7 }, (_, i) => currentPeriodId - i).filter(
      (id) => id > 0
    );
    const last30 = Array.from({ length: 30 }, (_, i) => currentPeriodId - i).filter(
      (id) => id > 0
    );

    const last7Totals: Array<Map<number, number>> = [];
    for (const periodId of last7) {
      last7Totals.push(await fetchPeriodTotals(periodId));
    }

    const last30Totals: Array<Map<number, number>> = [];
    for (const periodId of last30) {
      last30Totals.push(await fetchPeriodTotals(periodId));
    }

    const responsePayload = rosterPlayers.map((player) => {
      const playerId = player.id ?? 0;
      const totals7 = last7Totals
        .map((map) => map.get(playerId))
        .filter((value): value is number => value !== undefined);
      const totals30 = last30Totals
        .map((map) => map.get(playerId))
        .filter((value): value is number => value !== undefined);

      const avg7 =
        totals7.length > 0
          ? totals7.reduce((sum, value) => sum + value, 0) / totals7.length
          : null;
      const avg30 =
        totals30.length > 0
          ? totals30.reduce((sum, value) => sum + value, 0) / totals30.length
          : null;

      return {
        ...player,
        rolling: {
          avg7,
          avg30,
          periods7: totals7.length,
          periods30: totals30.length,
        },
      };
    });

    res.json({
      scoringPeriodId: currentPeriodId,
      players: responsePayload,
    });
  } catch (error) {
    console.error("Public rolling request error", error);
    res.status(500).json({ error: "Failed to reach rolling stats endpoint." });
  }
});

app.get("/api/espn/public/available-players", async (_req, res) => {
  const baseUrl =
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/wfba/seasons/2025/segments/0/leagues/133498200";
  const baseParams = new URLSearchParams({
    scoringPeriodId: "120",
    view: "kona_player_info",
    platformVersion: "f23636631f3d5609b41daa409faa6f587135a0fb",
  });
  const baseFilter = {
    players: {
      filterStatus: {
        value: ["FREEAGENT", "WAIVERS"],
      },
      filterSlotIds: {
        value: [0, 1, 2, 3, 4, 5],
      },
      filterRanksForScoringPeriodIds: {
        value: [120],
      },
      limit: 50,
      offset: 0,
      sortPercOwned: {
        sortAsc: false,
        sortPriority: 1,
      },
      sortDraftRanks: {
        sortPriority: 100,
        sortAsc: true,
        value: "STANDARD",
      },
      filterRanksForRankTypes: {
        value: ["STANDARD"],
      },
      filterStatsForTopScoringPeriodIds: {
        value: 5,
        additionalValue: ["002025", "102025", "002024", "012025", "022025", "032025", "042025"],
      },
    },
  };

  try {
    const playersUrl = `${baseUrl}?${baseParams.toString()}`;
    const requestPlayers = async (offset: number) => {
      const filterPayload = {
        ...baseFilter,
        players: {
          ...baseFilter.players,
          offset,
        },
      };

      const playersResponse = await fetch(playersUrl, {
        headers: {
          Accept: "application/json",
          "x-fantasy-filter": JSON.stringify(filterPayload),
        },
      });

      if (!playersResponse.ok) {
        console.error("Public available request failed (players)", {
          status: playersResponse.status,
          statusText: playersResponse.statusText,
          responseUrl: playersResponse.url,
        });
        res.status(500).json({ error: "Failed to fetch players data." });
        return null;
      }

      const playersData = (await playersResponse.json()) as EspnKonaPlayerInfoResponse;
      return playersData.players ?? [];
    };

    const allPlayers: NonNullable<EspnKonaPlayerInfoResponse["players"]> = [];
    const pageLimit = baseFilter.players.limit;
    for (let offset = 0; offset < 10000; offset += pageLimit) {
      const pagePlayers = await requestPlayers(offset);
      if (!pagePlayers) {
        return;
      }
      if (pagePlayers.length === 0) {
        break;
      }
      allPlayers.push(...pagePlayers);
      if (pagePlayers.length < pageLimit) {
        break;
      }
    }

    const outputPath = path.resolve(__dirname, "..", "data", "espn-available-raw.json");
    const availablePlayers: EspnPlayerWithStats[] = allPlayers
      .map((entry) => entry.player)
      .filter((player): player is EspnPlayerWithStats => Boolean(player));
    writeFileSync(outputPath, JSON.stringify({ players: availablePlayers }, null, 2), "utf-8");

    res.json({ players: availablePlayers });
  } catch (error) {
    console.error("Public available request error", error);
    res.status(500).json({ error: "Failed to reach available players endpoint." });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
