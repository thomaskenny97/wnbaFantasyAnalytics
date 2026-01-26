import { useMemo, useState } from "react";

type Player = {
  id: number;
  name: string;
  positions: string[];
};

type OptimizationSettings = {
  startDate: string;
  endDate: string;
  scoringMethod: "SEASON_AVERAGE" | "ROLLING_30";
  lockedPlayerIds: number[];
  droppablePlayerIds: number[];
};

const mockRoster: Player[] = [
  { id: 1, name: "Sabrina Ionescu", positions: ["G"] },
  { id: 2, name: "A'ja Wilson", positions: ["F", "C"] },
  { id: 3, name: "Breanna Stewart", positions: ["F"] },
  { id: 4, name: "Kelsey Plum", positions: ["G"] },
];

const toIsoDate = (value: string) =>
  value ? new Date(`${value}T00:00:00`).toISOString() : "";

const toDateInputValue = (isoValue: string) => {
  if (!isoValue) {
    return "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
};

const Optimization = () => {
  const [settings, setSettings] = useState<OptimizationSettings>({
    startDate: "",
    endDate: "",
    scoringMethod: "SEASON_AVERAGE",
    lockedPlayerIds: [],
    droppablePlayerIds: [],
  });

  const lockedSet = useMemo(
    () => new Set(settings.lockedPlayerIds),
    [settings.lockedPlayerIds]
  );

  const droppableOptions = useMemo(
    () => mockRoster.filter((player) => !lockedSet.has(player.id)),
    [lockedSet]
  );

  const dateError = useMemo(() => {
    if (!settings.startDate || !settings.endDate) {
      return "Start and end dates are required.";
    }
    if (new Date(settings.endDate) < new Date(settings.startDate)) {
      return "End date cannot be earlier than start date.";
    }
    return "";
  }, [settings.startDate, settings.endDate]);

  const handleDateChange = (key: "startDate" | "endDate") => (value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: toIsoDate(value),
    }));
  };

  const handleLockedChange = (selectedIds: number[]) => {
    setSettings((prev) => ({
      ...prev,
      lockedPlayerIds: selectedIds,
      droppablePlayerIds: prev.droppablePlayerIds.filter(
        (id) => !selectedIds.includes(id)
      ),
    }));
  };

  const handleDroppableChange = (selectedIds: number[]) => {
    setSettings((prev) => ({
      ...prev,
      droppablePlayerIds: selectedIds.filter((id) => !prev.lockedPlayerIds.includes(id)),
    }));
  };

  const isRunDisabled = Boolean(dateError);

  return (
    <section>
      <h1>Optimization Settings</h1>

      <div>
        <h2>Date Range</h2>
        <p>Select the time window the optimizer should target.</p>
        <label htmlFor="start-date">Start date</label>
        <input
          id="start-date"
          type="date"
          value={toDateInputValue(settings.startDate)}
          onChange={(event) => handleDateChange("startDate")(event.target.value)}
          required
        />
        <label htmlFor="end-date">End date</label>
        <input
          id="end-date"
          type="date"
          value={toDateInputValue(settings.endDate)}
          onChange={(event) => handleDateChange("endDate")(event.target.value)}
          required
          min={toDateInputValue(settings.startDate)}
        />
        {dateError && <p>{dateError}</p>}
      </div>

      <div>
        <h2>Scoring Settings</h2>
        <p>Choose the scoring method used to rank player performance.</p>
        <label htmlFor="scoring-method">Scoring methodology</label>
        <select
          id="scoring-method"
          value={settings.scoringMethod}
          onChange={(event) =>
            setSettings((prev) => ({
              ...prev,
              scoringMethod: event.target.value as OptimizationSettings["scoringMethod"],
            }))
          }
        >
          <option value="SEASON_AVERAGE">Full season average points per game</option>
          <option value="ROLLING_30">Rolling 30-day average points per game</option>
        </select>
      </div>

      <div>
        <h2>Roster Constraints</h2>
        <p>Lock core players and define who can be dropped.</p>
        <label htmlFor="locked-players">Locked players (cannot be dropped)</label>
        <select
          id="locked-players"
          multiple
          value={settings.lockedPlayerIds.map(String)}
          onChange={(event) => {
            const selected = Array.from(event.target.selectedOptions).map((option) =>
              Number(option.value)
            );
            handleLockedChange(selected);
          }}
        >
          {mockRoster.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.positions.join(", ")})
            </option>
          ))}
        </select>

        <label htmlFor="droppable-players">Players eligible to drop</label>
        <select
          id="droppable-players"
          multiple
          value={settings.droppablePlayerIds.map(String)}
          onChange={(event) => {
            const selected = Array.from(event.target.selectedOptions).map((option) =>
              Number(option.value)
            );
            handleDroppableChange(selected);
          }}
        >
          {droppableOptions.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.positions.join(", ")})
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={isRunDisabled}
        onClick={() => {
          console.log("Optimization settings", settings);
        }}
      >
        Run Optimization
      </button>
    </section>
  );
};

export default Optimization;
