import type { ReactNode } from "react";
import NavigationBar from "@/components/navigation-bar/NavigationBar";
import styles from "./AdminLayout.module.css";

type AdminLayoutProps = {
  children: ReactNode;
  currentGameId?: number | null;
};

export default function AdminLayout({
  children,
  currentGameId,
}: AdminLayoutProps): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.navRow}>
        <NavigationBar className={styles.navigation} currentGameId={currentGameId} />
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
