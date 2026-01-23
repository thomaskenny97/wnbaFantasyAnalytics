import { useState } from "react";
import axios from "axios";
import "./App.css";

type EspnPublicPlayer = {
  id: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
};

function App() {
  const [espnRoster, setEspnRoster] = useState<EspnPublicPlayer[]>([]);
  const [isEspnLoading, setIsEspnLoading] = useState(false);
  const [espnError, setEspnError] = useState<string | null>(null);

  const handleEspnTest = async () => {
    setIsEspnLoading(true);
    setEspnError(null);
    try {
      const rosterResponse = await axios.get<EspnPublicPlayer[]>(
        "http://localhost:3001/api/espn/public/my-roster"
      );
      setEspnRoster(rosterResponse.data);
    } catch (error) {
      console.error("Failed to load ESPN roster", error);
      setEspnError("Failed to load ESPN roster.");
      setEspnRoster([]);
    } finally {
      setIsEspnLoading(false);
    }
  };

  return (
    <main className="app">
      <section>
        <h1>My WNBA Team</h1>
        <button type="button" onClick={handleEspnTest} disabled={isEspnLoading}>
          {isEspnLoading ? "Testing..." : "Test ESPN API"}
        </button>
        {espnError && <p>{espnError}</p>}
        {!isEspnLoading && !espnError && espnRoster.length > 0 && (
          <ul>
            {espnRoster.map((player) => (
              <li key={player.id}>
                {player.fullName ??
                  [player.firstName, player.lastName].filter(Boolean).join(" ")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
