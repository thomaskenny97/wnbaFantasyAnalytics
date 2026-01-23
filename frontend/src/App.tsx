import { useState } from "react";
import axios from "axios";
import Navbar from "./Components/Navbar";
import Analytics from "./Pages/Analytics";
import Optimization from "./Pages/Optimization";
import Overview from "./Pages/Overview";
import "./App.css";

type EspnPublicPlayer = {
  id: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
};

function App() {
  const [activePage, setActivePage] = useState<
    "overview" | "optimization" | "analytics"
  >("overview");
  const [espnRoster, setEspnRoster] = useState<EspnPublicPlayer[]>([]);
  const [isEspnLoading, setIsEspnLoading] = useState(false);
  const [espnError, setEspnError] = useState<string | null>(null);
  const pageContent =
    activePage === "optimization" ? (
      <Optimization />
    ) : activePage === "analytics" ? (
      <Analytics />
    ) : (
      <Overview />
    );

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
        <Navbar activePage={activePage} onNavigate={setActivePage} />
        {pageContent}
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
