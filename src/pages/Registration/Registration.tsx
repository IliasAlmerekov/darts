import React, { useState } from "react";
import "./Registration.module.css";
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
          "Content-Type": "application/json",
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
    <div className="login-container">
      <div className="login-row">
        <div className="login-col">
          <div className="login-card">
            <div className="login-card-body">
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}

                <h1>Create an account</h1>

                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <div className="input-group">
                  <span className="input-group-icon">
                    <img src={userIcon} className="icon" alt="user" />
                  </span>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    className="form-control"
                    required
                    disabled={loading}
                  />
                </div>

                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <div className="input-group">
                  <span className="input-group-icon">
                    <img src={emailIcon} className="icon" alt="email" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className="form-control"
                    required
                    disabled={loading}
                  />
                </div>

                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-group">
                  <span className="input-group-icon">
                    <img src={passwordIcon} className="icon" alt="password" />
                  </span>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    className="form-control"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-footer">
                  <button className="btn btn-primary" type="submit" disabled={loading}>
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
