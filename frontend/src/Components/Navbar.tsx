import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar__title">WNBA Fantasy Lineup Optimizer</div>
      <div className="navbar__links">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `navbar__link${isActive ? " navbar__link--active" : ""}`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to="/optimization"
          className={({ isActive }) =>
            `navbar__link${isActive ? " navbar__link--active" : ""}`
          }
        >
          Optimization
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `navbar__link${isActive ? " navbar__link--active" : ""}`
          }
        >
          Analytics
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
