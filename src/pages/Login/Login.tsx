import React, { useState, useEffect } from "react";
import "./index.css";

function Login() {
  const [formData, setFormData] = useState({
    _username: "", // Wichtig: Symfony erwartet _username
    _password: "", // Wichtig: Symfony erwartet _password
  });
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

  // CSRF Token beim Laden holen
  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/csrf-token`, {
        credentials: "include", // Wichtig für Cookies/Sessions
      });
      const data = await response.json();
      setCsrfToken(data.token);
    } catch (err) {
      console.error("Failed to fetch CSRF token", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include", // Wichtig für Cookies/Sessions
        body: JSON.stringify({
          _username: formData._username,
          _password: formData._password,
          _csrf_token: csrfToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      if (data.success) {
        console.log("Login successful", data);
        // Redirect oder State Update
        window.location.href = "/dashboard";
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message);
      // CSRF Token neu laden nach Fehler
      fetchCsrfToken();
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

                <h1>Please sign in</h1>

                <label htmlFor="_username" className="form-label">
                  Email
                </label>
                <div className="input-group">
                  <span className="input-group-icon"></span>
                  <input
                    type="email"
                    name="_username"
                    id="_username"
                    className="form-control"
                    value={formData._username}
                    onChange={handleInputChange}
                    autoComplete="email"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <label htmlFor="_password" className="form-label">
                  Password
                </label>
                <div className="input-group">
                  <span className="input-group-icon"></span>
                  <input
                    type="password"
                    name="_password"
                    id="_password"
                    className="form-control"
                    value={formData._password}
                    onChange={handleInputChange}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-footer">
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                  <div className="register-link">
                    <a href="/register">Don't have an account?</a>
                  </div>
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
