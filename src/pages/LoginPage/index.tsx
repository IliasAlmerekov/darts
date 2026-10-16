import React from "react";
import styles from "./LoginPage.module.css";
import { useLoginPage } from "./useLoginPage";
import { LoginForm } from "./LoginForm";
import LoginCheckScreen from "./LoginCheckScreen";
import InvitationErrorScreen from "./InvitationErrorScreen";
import deepblueLogo from "@/assets/icons/madeByDeepblue.svg";

function LoginPage(): React.JSX.Element {
  const { screen, error, loading, successMessage, handleSubmit, goToPlayerProfile } =
    useLoginPage();

  if (screen.type === "checking") {
    return <LoginCheckScreen />;
  }

  if (screen.type === "invitation-error") {
    return (
      <InvitationErrorScreen
        invitationError={screen.invitationError}
        onGoToPlayerProfile={goToPlayerProfile}
      />
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginRow}>
        <div className={styles.loginCol}>
          <div className={styles.logoWrapper}>
            <img src={deepblueLogo} alt="deepblue" className={styles.logo} />
          </div>
          <div className={styles.loginCard}>
            <div className={styles.loginCardBody}>
              <LoginForm
                error={error}
                success={successMessage}
                loading={loading}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
