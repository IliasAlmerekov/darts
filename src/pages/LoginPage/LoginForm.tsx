import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import styles from "./LoginForm.module.css";
import { ROUTES } from "@/lib/router/routes";

interface LoginFormProps {
  error: string | null;
  success?: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function LoginForm({
  error,
  success,
  loading,
  onSubmit,
}: LoginFormProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  // The status region mounts empty and receives its text on the next frame, because
  // screen readers announce changes to a live region, not a region that appears filled.
  const [announcedSuccess, setAnnouncedSuccess] = useState<string | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setAnnouncedSuccess(success ?? null);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [success]);

  function handleTogglePassword(): void {
    setShowPassword((prev) => !prev);
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.formTitle}>Sign in</h1>
        <p className={styles.formSubtitle}>Enter your credentials to access your account</p>
      </div>

      <div role="status">
        {announcedSuccess && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>{announcedSuccess}</div>
        )}
      </div>
      {error && (
        <div role="alert" className={`${styles.alert} ${styles.alertDanger}`}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className={styles.form} data-testid="login-form">
        <div className={styles.fieldGroup}>
          <label htmlFor="_username" className={styles.formLabel}>
            Email <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.inputIcon} size={20} aria-hidden="true" />
            <input
              type="email"
              name="_username"
              id="_username"
              placeholder="name@db-n.com"
              className={styles.formControl}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="_password" className={styles.formLabel}>
            Password <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={20} aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              name="_password"
              id="_password"
              placeholder="Enter your password..."
              className={`${styles.formControl} ${styles.passwordInput}`}
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={handleTogglePassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={20} aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className={styles.signup}>
        Don&apos;t have an account?{" "}
        <Link to={ROUTES.register} className={styles.signupLink}>
          Sign up
        </Link>
      </p>
    </>
  );
}
