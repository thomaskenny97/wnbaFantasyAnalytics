import { useMemo, useState } from "react";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";

type Player = {
  id: number;
  name: string;
  positions: string[];
};

type OptimizationSettings = {
  startDate: string;
  endDate: string;
  scoringMethod: "SEASON_AVERAGE" | "ROLLING_30";
  droppablePlayerIds: number[];
};

const mockRoster: Player[] = [
  { id: 1, name: "Sabrina Ionescu", positions: ["G"] },
  { id: 2, name: "A'ja Wilson", positions: ["F", "C"] },
  { id: 3, name: "Breanna Stewart", positions: ["F"] },
  { id: 4, name: "Kelsey Plum", positions: ["G"] },
];

const Optimization = () => {
  const [settings, setSettings] = useState<OptimizationSettings>({
    startDate: "",
    endDate: "",
    scoringMethod: "SEASON_AVERAGE",
    droppablePlayerIds: [],
  });

  const droppableOptions = useMemo(
    () =>
      mockRoster.map((player) => ({
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

  const isRunDisabled = Boolean(dateError);

  return (
    <section>
      <h1>Optimization Settings</h1>

      <div>
        <h2>Date Range</h2>
        <p>Select the time window the optimizer should target.</p>
        <label htmlFor="start-date">Start date</label>
        <Calendar
          id="start-date"
          value={settings.startDate ? new Date(settings.startDate) : null}
          onChange={(event) => handleDateChange("startDate")(event.value ?? null)}
          dateFormat="yy-mm-dd"
          showIcon
          required
        />
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
        {dateError && <p>{dateError}</p>}
      </div>

      <div>
        <h2>Scoring Settings</h2>
        <p>Choose the scoring method used to rank player performance.</p>
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

      <div>
        <h2>Roster Constraints</h2>
        <p>Select the players the optimizer is allowed to drop.</p>
        <label htmlFor="droppable-players">Players eligible to drop</label>
        <MultiSelect
          id="droppable-players"
          value={settings.droppablePlayerIds}
          options={droppableOptions}
          onChange={(event) => handleDroppableChange(event.value ?? [])}
          placeholder="Select droppable players"
          display="chip"
        />
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
