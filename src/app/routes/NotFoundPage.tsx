import React from "react";
import { ErrorState } from "@/components/error-state";
import styles from "./NotFoundPage.module.css";

function NotFoundPage(): React.JSX.Element {
  return (
    <main className={styles.container}>
      <ErrorState
        variant="page"
        title="Page not found"
        message="The page you requested does not exist or has been moved."
        primaryAction={{ label: "Go to login", to: "/" }}
        secondaryAction={{ label: "Go to start", to: "/start" }}
      />
    </main>
  );
}

export default NotFoundPage;
