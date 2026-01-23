import { Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Analytics from "./Pages/Analytics";
import Optimization from "./Pages/Optimization";
import Overview from "./Pages/Overview";
import "./App.css";

function App() {
  return (
    <main className="app">
      <Navbar />
      <section>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/optimization" element={<Optimization />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </section>
    </main>
  );
}

export default App;
