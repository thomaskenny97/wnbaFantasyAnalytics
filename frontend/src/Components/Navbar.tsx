type NavbarProps = {
  activePage: "overview" | "optimization" | "analytics";
  onNavigate: (page: "overview" | "optimization" | "analytics") => void;
};

const Navbar = ({ activePage, onNavigate }: NavbarProps) => {
  return (
    <nav className="navbar">
      <button
        type="button"
        onClick={() => onNavigate("overview")}
        aria-current={activePage === "overview" ? "page" : undefined}
      >
        Overview
      </button>
      <button
        type="button"
        onClick={() => onNavigate("optimization")}
        aria-current={activePage === "optimization" ? "page" : undefined}
      >
        Optimization
      </button>
      <button
        type="button"
        onClick={() => onNavigate("analytics")}
        aria-current={activePage === "analytics" ? "page" : undefined}
      >
        Analytics
      </button>
    </nav>
  );
};

export default Navbar;
