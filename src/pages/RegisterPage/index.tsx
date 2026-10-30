import React from "react";
import styles from "./RegisterPage.module.css";
import { useRegistrationPage } from "./useRegistrationPage";
import { RegisterForm } from "./RegisterForm";
import { InvitationErrorScreen } from "@/shared/ui/invitation-error-screen";
import JoiningScreen from "./JoiningScreen";
import deepblueLogo from "@/assets/icons/madeByDeepblue.svg";

function RegisterPage(): React.JSX.Element {
  const { screen, error, loading, formAction, values, goToPlayerProfile } = useRegistrationPage();

  if (screen.type === "joining") {
    return <JoiningScreen />;
  }

  if (screen.type === "invitation-error") {
    return (
      <InvitationErrorScreen message={screen.message} onGoToPlayerProfile={goToPlayerProfile} />
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginRow}>
        <div className={styles.loginCol}>
          <div className={styles.logoWrapper}>
            <img src={deepblueLogo} alt="DeepBlue" className={styles.logo} />
          </div>
          <div className={styles.loginCard}>
            <div className={styles.loginCardBody}>
              <RegisterForm error={error} loading={loading} action={formAction} values={values} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
