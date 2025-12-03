import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import emailIcon from "../../icons/email.svg";
import passwordIcon from "../../icons/password.svg";
import LoadingAuth from "../../components/login-success-skeleton/LoadingAuth";
import { useAuthenticatedUser } from "../../hooks/useAuthenticatedUser";

function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: checking } = useAuthenticatedUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      const response = await fetch(`/api/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      console.log("Login successful:", data);

      if (data.redirect) {
        navigate(data.redirect);
      }
    } catch (error) {
      setError((error as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      navigate(user.redirect);
    }
  }, [user, navigate]);

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

export default Login;
