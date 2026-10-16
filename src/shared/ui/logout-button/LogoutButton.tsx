import React from "react";
import { useLogout } from "@/shared/hooks/useLogout";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import styles from "./LogoutButton.module.css";

export function LogoutButton(): React.JSX.Element {
  const { isPending, errorMessage, requestLogout } = useLogout();

  return (
    <div className={styles.root}>
      {errorMessage !== null ? (
        <ErrorState
          title="Could not log out"
          message={errorMessage}
          primaryAction={{ label: "Retry", onClick: requestLogout }}
        />
      ) : (
        <Button type="secondary" label="Log out" handleClick={requestLogout} disabled={isPending} />
      )}
    </div>
  );
}
