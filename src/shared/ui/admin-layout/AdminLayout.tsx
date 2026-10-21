import type { ReactNode } from "react";
import type { TabletGame } from "@/shared/api/game";
import { NavigationBar } from "@/shared/ui/navigation-bar";
import styles from "./AdminLayout.module.css";

interface AdminLayoutProps {
  children: ReactNode;
  tabletGame?: TabletGame | null;
}

export default function AdminLayout({ children, tabletGame }: AdminLayoutProps): React.JSX.Element {
  const navigationBarProps = {
    ...(styles.navigation !== undefined ? { className: styles.navigation } : {}),
    ...(tabletGame !== undefined ? { tabletGame } : {}),
  };

  return (
    <div className={styles.page}>
      <div className={styles.navRow}>
        <NavigationBar {...navigationBarProps} />
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
