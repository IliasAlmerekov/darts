import React, { useState, useEffect } from "react";
import "./index.css";
import emailIcon from "../../icons/email.svg";
import passwordIcon from "../../icons/password.svg";

function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

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

      // Save logged in user data
      setLoggedInUser(data);

      if (data.redirect) {
        //window.location.href = data.redirect;
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:8001/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggedInUser(null);
      setError(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`http://localhost:8001/login/success`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setLoggedInUser(data);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (checking) {
    return (
      <div className="login-container">
        <div className="login-row">
          <div className="login-col">
            <div className="login-card">
              <div className="login-card-body">
                <h1>Checking authentication...</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show logged in state
  if (loggedInUser) {
    return (
      <div className="login-container">
        <div className="login-row">
          <div className="login-col">
            <div className="login-card">
              <div className="login-card-body">
                <h1>✓ Logged in</h1>
                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    background: "#d4edda",
                    borderRadius: "5px",
                  }}
                >
                  <h3>Account Information:</h3>
                  <pre style={{ marginTop: "10px", textAlign: "left" }}>
                    {JSON.stringify(loggedInUser, null, 2)}
                  </pre>
                </div>
                <div className="form-footer" style={{ marginTop: "20px" }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleLogout}
                    disabled={loading}
                  >
                    {loading ? "loging out..." : "logout"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login form
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
                    <img src={emailIcon} className="icon" />
                  </span>
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
                  <span className="input-group-icon">
                    <img src={passwordIcon} className="icon" />
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
