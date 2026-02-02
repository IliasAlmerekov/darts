import React from "react";
import { Link } from "react-router-dom";
import styles from "./LoginPage.module.css";
import emailIcon from "@/assets/icons/email.svg";
import passwordIcon from "@/assets/icons/password.svg";
import LoadingAuth from "@/components/skeletons/LoadingAuth";
import { useLoginPage } from "../hooks/useLoginPage";

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
              <form onSubmit={handleSubmit}>
                {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}

                <h1>Please sign in</h1>

                <label htmlFor="_username" className={styles.formLabel}>
                  Email
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputGroupIcon}>
                    <img src={emailIcon} className={styles.icon} alt="email Icon" />
                  </span>
                  <input
                    type="email"
                    name="_username"
                    id="_username"
                    className={styles.formControl}
                    required
                    disabled={loading}
                  />
                </div>

                <label htmlFor="_password" className={styles.formLabel}>
                  Password
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputGroupIcon}>
                    <img src={passwordIcon} className={styles.icon} alt="password icon" />
                  </span>
                  <input
                    type="password"
                    name="_password"
                    id="_password"
                    className={styles.formControl}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formFooter}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <small>
                    Don&apos;t have an account? <Link to="/register">Create one</Link>
                  </small>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
