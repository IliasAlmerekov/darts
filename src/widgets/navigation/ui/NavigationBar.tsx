import { NavLink } from "react-router-dom";
import styles from "./NavigationBar.module.css";

interface NavItem {
  label: string;
  to: string;
}

interface NavigationBarProps {
  brand?: string;
  items?: NavItem[];
}

const defaultItems: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Games", to: "/games" },
  { label: "Stats", to: "/stats" },
];

export function NavigationBar({ brand = "Darts", items = defaultItems }: NavigationBarProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>{brand}</div>
      <div className={styles.links}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ""}`.trim()
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
