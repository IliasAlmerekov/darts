import React from "react";
import { useLocation } from "react-router-dom";
import styles from "./LoginPage.module.css";
import LoadingAuth from "@/components/skeletons/LoadingAuth";
import { useLoginPage } from "../hooks/useLoginPage";
import { LoginForm } from "../components/LoginForm";
import deepblueLogo from "@/assets/icons/madeByDeepblue.svg";

function LoginPage(): React.JSX.Element {
  const { error, loading, checking, handleSubmit } = useLoginPage();
  const location = useLocation();
  const successMessage =
    new URLSearchParams(location.search).get("left") === "1"
      ? "Sie haben das Spiel erfolgreich verlassen"
      : null;

  if (checking) {
    return <LoadingAuth />;
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
