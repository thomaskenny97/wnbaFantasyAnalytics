import { useEffect, useState } from "react";
import axios from "axios";
import AvailablePlayersTable from "../Components/AvailablePlayersTable";
import type { Player } from "../Components/RosterTable";

const AvailablePlayers = () => {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadAvailablePlayers = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await axios.get<{ players: Player[] }>(
          "http://localhost:3001/api/espn/public/available-players"
        );
        setAvailablePlayers(response.data.players);
      } catch (error) {
        console.error("Failed to load available players", error);
        setErrorMessage("Failed to load available players.");
        setAvailablePlayers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailablePlayers();
  }, []);

  return (
    <section>
      <h2>Available Players</h2>
      {isLoading && <p>Loading available players...</p>}
      {errorMessage && <p>{errorMessage}</p>}
      {!isLoading && !errorMessage && availablePlayers.length > 0 && (
        <AvailablePlayersTable players={availablePlayers} />
      )}
    </section>
  );
};

export default AvailablePlayers;
