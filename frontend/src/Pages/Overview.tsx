import { useEffect, useState } from "react";
import axios from "axios";
import RosterTable from "../Components/RosterTable";
import type { Player } from "../Components/RosterTable";

const Overview = () => {
  const [espnRoster, setEspnRoster] = useState<Player[]>([]);
  const [isEspnLoading, setIsEspnLoading] = useState(false);
  const [espnError, setEspnError] = useState<string | null>(null);

  const loadRoster = async () => {
    setIsEspnLoading(true);
    setEspnError(null);
    try {
      const rosterResponse = await axios.get<{
        players: Player[];
      }>("http://localhost:3001/api/espn/public/roster-rolling");
      setEspnRoster(rosterResponse.data.players);
    } catch (error) {
      console.error("Failed to load ESPN roster", error);
      setEspnError("Failed to load ESPN roster.");
      setEspnRoster([]);
    } finally {
      setIsEspnLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  return (
    <section>
      <h2>Fantasy Team Roster</h2>
      {isEspnLoading && <p>Loading roster...</p>}
      {espnError && <p>{espnError}</p>}
      {!isEspnLoading && !espnError && espnRoster.length > 0 && (
        <RosterTable players={espnRoster} />
      )}
    </section>
  );
};

export default Overview;
