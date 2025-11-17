import React, { useState } from "react";
import "./index.css";

function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      const response = await fetch(`http://localhost:8001/login`, {
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
        window.location.href = data.redirect;
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
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
