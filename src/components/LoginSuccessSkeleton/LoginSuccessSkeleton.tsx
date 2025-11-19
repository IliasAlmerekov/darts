import "./index.css";
import React from "react";
export default function LoginSuccessSkeleton(): React.JSX.Element {
  return (
    <div className="login-container">
      <div className="login-row">
        <div className="login-col">
          <div className="login-card">
            <div className="login-card-body">
              <div className="skeleton skeleton-title-large"></div>

              <div className="skeleton-success-box">
                <div className="skeleton skeleton-subtitle"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-text short"></div>
              </div>

              <div className="form-footer" style={{ marginTop: "20px" }}>
                <div className="skeleton skeleton-button"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
