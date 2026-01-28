import { useMemo, useState } from "react";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { dummyFantasyData } from "../data/dummyFantasyData";
import {
  optimizeWeeklyLineup,
  type OptimizationResult,
} from "../optimizer/weeklyOptimizer";

type OptimizationSettings = {
  startDate: string;
  endDate: string;
  scoringMethod: "SEASON_AVERAGE" | "ROLLING_30";
  droppablePlayerIds: number[];
};

const Optimization = () => {
  const [settings, setSettings] = useState<OptimizationSettings>({
    startDate: "",
    endDate: "",
    scoringMethod: "SEASON_AVERAGE",
    droppablePlayerIds: [],
  });
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [hasAttemptedRun, setHasAttemptedRun] = useState(false);

  const droppableOptions = useMemo(
    () =>
      dummyFantasyData.roster.map((player) => ({
        label: `${player.name} (${player.positions.join(", ")})`,
        value: player.id,
      })),
    []
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

  const handleDateChange = (key: "startDate" | "endDate") => (value: Date | null) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value ? value.toISOString() : "",
    }));
  };

  const handleDroppableChange = (selectedIds: number[]) => {
    setSettings((prev) => ({
      ...prev,
      droppablePlayerIds: selectedIds,
    }));
  };

  const getPlayerAverage = (playerId: number) => {
    const player = dummyFantasyData.roster.find((entry) => entry.id === playerId);
    if (!player) {
      return 0;
    }
    return settings.scoringMethod === "ROLLING_30"
      ? player.rolling30DayAvgPoints
      : player.seasonAvgPoints;
  };

  const isRunDisabled = Boolean(dateError);

  return (
    <section className="optimization-page">
      <header className="optimization-header">
        <h1 className="optimization-title">Optimization Settings</h1>
        <p className="optimization-subtitle">
          Configure date range, scoring, and roster constraints for lineup optimization.
        </p>
      </header>

      <div className="optimization-grid">
        <div className="optimization-card">
          <h2>Date Range</h2>
          <p className="optimization-help">
            Select the time window the optimizer should target.
          </p>
          <div className="optimization-field">
            <label htmlFor="start-date">Start date</label>
            <Calendar
              id="start-date"
              value={settings.startDate ? new Date(settings.startDate) : null}
              onChange={(event) => handleDateChange("startDate")(event.value ?? null)}
              dateFormat="yy-mm-dd"
              showIcon
              required
            />
          </div>
          <div className="optimization-field">
            <label htmlFor="end-date">End date</label>
            <Calendar
              id="end-date"
              value={settings.endDate ? new Date(settings.endDate) : null}
              onChange={(event) => handleDateChange("endDate")(event.value ?? null)}
              dateFormat="yy-mm-dd"
              showIcon
              required
              minDate={settings.startDate ? new Date(settings.startDate) : undefined}
            />
          </div>
          {hasAttemptedRun && dateError && (
            <p className="optimization-error">{dateError}</p>
          )}
        </div>

        <div className="optimization-card">
          <h2>Scoring Settings</h2>
          <p className="optimization-help">
            Choose the scoring method used to rank player performance.
          </p>
          <div className="optimization-field">
            <label htmlFor="scoring-method">Scoring methodology</label>
            <Dropdown
              id="scoring-method"
              value={settings.scoringMethod}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  scoringMethod: event.value as OptimizationSettings["scoringMethod"],
                }))
              }
              options={[
                {
                  label: "Full season average points per game",
                  value: "SEASON_AVERAGE",
                },
                {
                  label: "Rolling 30-day average points per game",
                  value: "ROLLING_30",
                },
              ]}
              placeholder="Select scoring method"
            />
          </div>
        </div>

        <div className="optimization-card">
          <h2>Roster Constraints</h2>
          <p className="optimization-help">
            Select the players the optimizer is allowed to drop.
          </p>
          <div className="optimization-field">
            <label htmlFor="droppable-players">Players eligible to drop</label>
            <MultiSelect
              id="droppable-players"
              value={settings.droppablePlayerIds}
              options={droppableOptions}
              onChange={(event) => handleDroppableChange(event.value ?? [])}
              placeholder="Select droppable players"
              display="chip"
              filter
            />
          </div>
        </div>
      </div>

      <div className="optimization-actions">
        <button
          type="button"
          disabled={isRunDisabled}
          onClick={() => {
            setHasAttemptedRun(true);
            if (dateError) {
              return;
            }
            const optimizationResult = optimizeWeeklyLineup({
              roster: dummyFantasyData.roster,
              startDate: settings.startDate,
              endDate: settings.endDate,
              scoringMethod: settings.scoringMethod,
            });
            setResult(optimizationResult);
            console.log("Optimization settings", settings);
            console.log("Optimization result", optimizationResult);
          }}
          className="optimization-button"
        >
          Run Optimization
        </button>
      </div>

      {result && (
        <div className="optimization-results">
          <div className="optimization-summary">
            <h2>Optimization Results</h2>
            <p>Total projected points: {result.totalPoints.toFixed(1)}</p>
          </div>
          <div className="optimization-results-list">
            {result.dailyLineups.map((day) => (
              <div key={day.date} className="optimization-day-card">
                <div className="optimization-day-header">
                  <span>{day.date}</span>
                  <span>{day.totalPoints.toFixed(1)} pts</span>
                </div>
                <ul>
                  {day.starters.map((player) => (
                    <li key={player.id}>
                      {player.name} ({player.positions.join(", ")}) · Avg{" "}
                      {getPlayerAverage(player.id).toFixed(1)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default Optimization;
