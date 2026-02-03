import React from "react";
import styles from "./LoginPage.module.css";
import LoadingAuth from "@/components/skeletons/LoadingAuth";
import { useLoginPage } from "../hooks/useLoginPage";
import { LoginForm } from "../components/LoginForm";

function LoginPage(): React.JSX.Element {
  const { error, loading, checking, handleSubmit } = useLoginPage();

  if (checking) {
    return <LoadingAuth />;
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginRow}>
        <div className={styles.loginCol}>
          <div className={styles.loginCard}>
            <div className={styles.loginCardBody}>
              <LoginForm error={error} loading={loading} onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
