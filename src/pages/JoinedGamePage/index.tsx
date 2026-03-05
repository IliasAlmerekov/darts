import React from "react";
import styles from "./JoinedGamePage.module.css";

function JoinedGamePage(): React.JSX.Element {
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
                  background: "#d4edda",
                  borderRadius: "5px",
                  textAlign: "left",
                  color: "#155724",
                  border: "1px solid #c3e6cb",
                }}
              >
                <h3 style={{ marginBottom: "10px" }}>Willkommen im Spiel!</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinedGamePage;
