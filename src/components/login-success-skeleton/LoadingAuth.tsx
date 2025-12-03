import React from "react";
import "./index.css";

function LoadingAuth(): React.JSX.Element {
  return (
    <div className="loading-auth-container">
      <div className="loading-auth-content">
        <div className="spinner"></div>
        <h2>Checking authentication...</h2>
        <p>Please wait a moment</p>
      </div>
    </div>
  );
}

export default LoadingAuth;
