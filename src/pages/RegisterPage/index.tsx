import React from "react";
import styles from "./RegistrationPage.module.css";
import { useRegistrationPage } from "./useRegistrationPage";
import { RegisterForm } from "./RegisterForm";
import deepblueLogo from "@/assets/icons/madeByDeepblue.svg";

function RegisterPage(): React.JSX.Element {
  const { error, loading, handleSubmit } = useRegistrationPage();

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginRow}>
        <div className={styles.loginCol}>
          <div className={styles.logoWrapper}>
            <img src={deepblueLogo} alt="DeepBlue" className={styles.logo} />
          </div>
          <div className={styles.loginCard}>
            <div className={styles.loginCardBody}>
              <RegisterForm error={error} loading={loading} onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
