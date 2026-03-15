import type { ReactNode } from "react";
import { NavigationBar } from "@/shared/ui/navigation-bar";
import styles from "./AdminLayout.module.css";

interface AdminLayoutProps {
  children: ReactNode;
  currentGameId?: number | null;
}

export default function AdminLayout({
  children,
  currentGameId,
}: AdminLayoutProps): React.JSX.Element {
  const navigationBarProps = {
    ...(styles.navigation !== undefined ? { className: styles.navigation } : {}),
    ...(currentGameId !== undefined ? { currentGameId } : {}),
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
