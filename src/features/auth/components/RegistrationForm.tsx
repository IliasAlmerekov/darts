import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import styles from "./AuthForm.module.css";

interface RegistrationFormProps {
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function RegistrationForm({ error, loading, onSubmit }: RegistrationFormProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);

  function handleTogglePassword(): void {
    setShowPassword((prev) => !prev);
  }

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.formTitle}>Create an account</h1>
        <p className={styles.formSubtitle}>Enter your details to get started</p>
      </div>

      {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}

      {/* Form */}
      <form onSubmit={onSubmit} className={styles.form}>
        {/* Username */}
        <div className={styles.fieldGroup}>
          <label htmlFor="username" className={styles.formLabel}>
            Username <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrapper}>
            <User className={styles.inputIcon} size={20} aria-hidden="true" />
            <input
              type="text"
              name="username"
              id="username"
              placeholder="Enter your username..."
              className={styles.formControl}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
        </div>

        {/* Email */}
        <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.formLabel}>
            Email <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.inputIcon} size={20} aria-hidden="true" />
            <input
              type="email"
              name="email"
              id="email"
              placeholder="name@example.com..."
              className={styles.formControl}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div className={styles.fieldGroup}>
          <label htmlFor="password" className={styles.formLabel}>
            Password <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={20} aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              placeholder="Create a password..."
              className={`${styles.formControl} ${styles.passwordInput}`}
              required
              disabled={loading}
              autoComplete="new-password"
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

        {/* Submit Button */}
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      {/* Login Link */}
      <p className={styles.formLink}>
        Already have an account?{" "}
        <Link to="/">Sign in</Link>
      </p>
    </>
  );
}
