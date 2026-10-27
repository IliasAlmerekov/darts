import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import clsx from "clsx";
import type { RegistrationValues } from "./useRegistration";
import styles from "./RegisterForm.module.css";
import { ROUTES } from "@/lib/router/routes";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { REGISTRATION_EMAIL_DOMAIN } from "@/lib/auth/email";

interface RegistrationFormProps {
  error: string | null;
  loading: boolean;
  action: (formData: FormData) => void;
  /** The values to show in the fields; they survive the reset React 19 does after an action. */
  values: RegistrationValues;
}

export function RegisterForm({
  error,
  loading,
  action,
  values,
}: RegistrationFormProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);

  function handleTogglePassword(): void {
    setShowPassword((prev) => !prev);
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.formTitle}>Create an account</h1>
        <p className={styles.formSubtitle}>Enter your details to get started</p>
      </div>

      {error && (
        <div role="alert" className={`${styles.alert} ${styles.alertDanger}`}>
          {error}
        </div>
      )}

      <form action={action} className={styles.form} data-testid="register-form">
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
              defaultValue={values.username}
              placeholder="Enter your username..."
              className={styles.formControl}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
        </div>

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
              defaultValue={values.email}
              placeholder={`name${REGISTRATION_EMAIL_DOMAIN}`}
              className={styles.formControl}
              required
              aria-describedby="email-hint"
              disabled={loading}
            />
          </div>
          <p id="email-hint" className={styles.fieldHint}>
            Use your {REGISTRATION_EMAIL_DOMAIN} email address.
          </p>
        </div>

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
              defaultValue={values.password}
              placeholder="Create a password..."
              className={clsx(styles.formControl, styles.passwordInput)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              aria-describedby="password-hint"
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
          <p id="password-hint" className={styles.fieldHint}>
            At least {PASSWORD_MIN_LENGTH} characters.
          </p>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
          aria-label="Create account"
        >
          {loading ? <span className={styles.spinner} aria-hidden="true" /> : "Create account"}
        </button>
        {loading && (
          <span role="status" className={styles.srOnly}>
            Creating your account…
          </span>
        )}
      </form>

      <p className={styles.login}>
        Already have an account?{" "}
        <Link to={ROUTES.login} className={styles.loginLink}>
          Sign in
        </Link>
      </p>
    </>
  );
}
