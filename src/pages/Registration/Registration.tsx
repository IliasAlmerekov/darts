import React, { useState } from "react";
import styles from "./Registration.module.css";
import emailIcon from "../../icons/email.svg";
import passwordIcon from "../../icons/password.svg";
import userIcon from "../../icons/user.svg";
import { useNavigate } from "react-router-dom";

const Registration = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formElement = e.currentTarget;
      const username = (formElement.elements.namedItem("username") as HTMLInputElement).value;
      const email = (formElement.elements.namedItem("email") as HTMLInputElement).value;
      const password = (formElement.elements.namedItem("password") as HTMLInputElement).value;

      const response = await fetch(`/api/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          contentType: "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          plainPassword: password,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        // try parsing json message if available
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Registration failed");
        } catch (error) {
          console.error("Error parsing registration error response:", error);
        }
      }

      const data = await response.json();
      console.log("Registration successful:", data);
      if (data.redirect) {
        navigate(data.redirect);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setLoading(false);
    }
  };

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
};
export default Registration;
