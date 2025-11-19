import React, { useState } from "react";

const JoinedGame = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
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
              <h1>✓ Spiel beigetreten!</h1>
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#d4edda", // Helles Grün für Erfolgsmeldungen
                  borderRadius: "5px",
                  textAlign: "left", // Text innerhalb der Box linksbündig
                  color: "#155724", // Dunkelgrüner Text für bessere Lesbarkeit
                  border: "1px solid #c3e6cb",
                }}
              >
                <h3 style={{ marginBottom: "10px" }}>Willkommen im Spiel!</h3>
              </div>

              {/* Button zum Weiterleiten zum Spiel/Warteraum */}
              <div className="form-footer" style={{ marginTop: "20px" }}>
                <button className="btn btn-primary" onClick={handleLogout} disabled={loading}>
                  {loading ? "loging out..." : "logout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinedGame;
