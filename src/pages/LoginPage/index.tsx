import React from "react";
import styles from "./LoginPage.module.css";
import { useLoginPage } from "./useLoginPage";
import { LoginForm } from "./LoginForm";
import deepblueLogo from "@/assets/icons/madeByDeepblue.svg";

function LoginPage(): React.JSX.Element {
  const { error, loading, successMessage, handleSubmit } = useLoginPage();

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
