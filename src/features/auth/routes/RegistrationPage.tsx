import React from "react";
import styles from "./RegistrationPage.module.css";
import emailIcon from "@/assets/icons/email.svg";
import passwordIcon from "@/assets/icons/password.svg";
import userIcon from "@/assets/icons/user.svg";
import { useRegistrationPage } from "../hooks/useRegistrationPage";

function RegistrationPage(): React.JSX.Element {
  const { error, loading, handleSubmit } = useRegistrationPage();

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginRow}>
        <div className={styles.loginCol}>
          <div className={styles.loginCard}>
            <div className={styles.loginCardBody}>
              <form onSubmit={handleSubmit}>
                {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}

                <h1>Create an account</h1>

                <label htmlFor="username" className={styles.formLabel}>
                  Username
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputGroupIcon}>
                    <img src={userIcon} className={styles.icon} alt="user" />
                  </span>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    className={styles.formControl}
                    required
                    disabled={loading}
                  />
                </div>

                <label htmlFor="email" className={styles.formLabel}>
                  Email
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputGroupIcon}>
                    <img src={emailIcon} className={styles.icon} alt="email" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className={styles.formControl}
                    required
                    disabled={loading}
                  />
                </div>

                <label htmlFor="password" className={styles.formLabel}>
                  Password
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputGroupIcon}>
                    <img src={passwordIcon} className={styles.icon} alt="password" />
                  </span>
                  <input
                    type="password"
                    name="password"
                    id="password"
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
                    {loading ? "Creating..." : "Create account"}
                  </button>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <small>
                    Already have an account? <a href="/">Sign in</a>
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

export default RegistrationPage;
