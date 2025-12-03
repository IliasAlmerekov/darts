import "./index.css";
import "../../pages/start/start.module.css";
import React from "react";

export default function StartPageSkeleton(): React.JSX.Element {
  return (
    <div className="main">
      <div className="start">
        <div className="navigation skeleton-nav"></div>

        <div className="existing-player-list">
          <div className="header">
            <div className="skeleton skeleton-title-left"></div>
          </div>
          <div className="bottom">
            <div className="skeleton skeleton-button"></div>
          </div>
        </div>

        <div className="added-player-list">
          <div className="header-selected-players">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-count"></div>
          </div>
          <div className="selectedPlayerListScroll">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="skeleton skeleton-player-item"></div>
            ))}
          </div>
          <div className="start-btn">
            <div className="skeleton skeleton-start-button"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
