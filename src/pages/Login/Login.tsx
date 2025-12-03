import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./login.module.css";
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
    <div className="login-container">
      <div className="login-row">
        <div className="login-col">
          <div className="login-card">
            <div className="login-card-body">
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}

                <h1>Please sign in</h1>

                <label htmlFor="_username" className="form-label">
                  Email
                </label>
                <div className="input-group">
                  <span className="input-group-icon">
                    <img src={emailIcon} className="icon" alt="email Icon" />
                  </span>
                  <input
                    type="email"
                    name="_username"
                    id="_username"
                    className="form-control"
                    required
                    disabled={loading}
                  />
                </div>

                <label htmlFor="_password" className="form-label">
                  Password
                </label>
                <div className="input-group">
                  <span className="input-group-icon">
                    <img src={passwordIcon} className="icon" alt="password icon" />
                  </span>
                  <input
                    type="password"
                    name="_password"
                    id="_password"
                    className="form-control"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-footer">
                  <button className="btn btn-primary" type="submit" disabled={loading}>
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
