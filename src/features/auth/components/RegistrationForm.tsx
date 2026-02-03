import React from "react";
import { Link } from "react-router-dom";
import styles from "./AuthForm.module.css";
import emailIcon from "@/assets/icons/email.svg";
import passwordIcon from "@/assets/icons/password.svg";
import userIcon from "@/assets/icons/user.svg";

interface RegistrationFormProps {
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function RegistrationForm({ error, loading, onSubmit }: RegistrationFormProps) {
  return (
    <form onSubmit={onSubmit}>
      {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}

      <h1 className={styles.formTitle}>Create an account</h1>

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
          autoComplete="username"
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
          autoComplete="new-password"
        />
      </div>

      <div className={styles.formFooter}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </div>
      <div className={styles.formLink}>
        <small>
          Already have an account? <Link to="/">Sign in</Link>
        </small>
      </div>
    </form>
  );
}
