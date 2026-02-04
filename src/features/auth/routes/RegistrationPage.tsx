import React from "react";
import styles from "./RegistrationPage.module.css";
import { useRegistrationPage } from "../hooks/useRegistrationPage";
import { RegistrationForm } from "../components/RegistrationForm";
import deepblueLogo from "@/assets/icons/madeByDeepblue.svg";

function RegistrationPage(): React.JSX.Element {
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
              <RegistrationForm error={error} loading={loading} onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegistrationPage;
