import React from "react";
import { Link } from "react-router-dom";
import styles from "./AuthForm.module.css";
import emailIcon from "@/assets/icons/email.svg";
import passwordIcon from "@/assets/icons/password.svg";

interface LoginFormProps {
  error: string | null;
  success?: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function LoginForm({ error, success, loading, onSubmit }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}
      {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}

      <h1 className={styles.formTitle}>Please sign in</h1>

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
          autoComplete="username"
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
          autoComplete="current-password"
        />
      </div>

      <div className={styles.formFooter}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
      <div className={styles.formLink}>
        <small>
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </small>
      </div>
    </form>
  );
}
