import { useState } from "react";
import styles from "./joined-game.module.css";

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
    <div className={styles.loginContainer}>
      <div className={styles.loginRow}>
        <div className={styles.loginCol}>
          <div className={styles.loginCard}>
            <div className={styles.loginCardBody}>
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
              <div className={styles.formFooter} style={{ marginTop: "20px" }}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
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
};

export default JoinedGame;
