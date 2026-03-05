import React from "react";
import { ErrorState } from "@/shared/ui/error-state";
import styles from "./NotFoundPage.module.css";
import { ROUTES } from "@/lib/routes";

function NotFoundPage(): React.JSX.Element {
  return (
    <main className={styles.container}>
      <ErrorState
        variant="page"
        title="Page not found"
        message="The page you requested does not exist or has been moved."
        primaryAction={{ label: "Go to login", to: ROUTES.login }}
        secondaryAction={{ label: "Go to start", to: ROUTES.start() }}
      />
    </main>
  );
}

export default NotFoundPage;
