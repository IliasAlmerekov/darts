import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import styles from "./AuthForm.module.css";

interface LoginFormProps {
  error: string | null;
  success?: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function LoginForm({ error, success, loading, onSubmit }: LoginFormProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);

  function handleTogglePassword(): void {
    setShowPassword((prev) => !prev);
  }

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.formTitle}>Sign in</h1>
        <p className={styles.formSubtitle}>Enter your credentials to access your account</p>
      </div>

      {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>}
      {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}

      {/* Form */}
      <form onSubmit={onSubmit} className={styles.form}>
        {/* Email */}
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
              placeholder="name@example.com..."
              className={styles.formControl}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password */}
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

        {/* Remember Me */}
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            name="_remember_me"
            id="_remember_me"
            className={styles.checkbox}
            disabled={loading}
          />
          <label htmlFor="_remember_me" className={styles.checkboxLabel}>
            Remember me
          </label>
        </div>

        {/* Submit Button */}
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Register Link */}
      <p className={styles.formLink}>
        Don&apos;t have an account?{" "}
        <Link to="/register">Sign up</Link>
      </p>
    </>
  );
}
