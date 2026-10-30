import React from "react";
import { BackButton } from "@/shared/ui/back-button";
import { LinkButton } from "@/shared/ui/link-button";
import settingsIcon from "@/assets/icons/settings-inactive.svg";
import styles from "../GamePage.module.css";

interface HeaderSectionProps {
  handleOpenExitOverlay: () => void;
  handleOpenSettings: () => void;
  isSettingsDisabled: boolean;
}

export const HeaderSection = React.memo(function HeaderSection({
  handleOpenExitOverlay,
  handleOpenSettings,
  isSettingsDisabled,
}: HeaderSectionProps): React.JSX.Element {
  return (
    <header className={styles.gameHeader}>
      <BackButton onClick={handleOpenExitOverlay} ariaLabel="Back to Home" />
      <LinkButton
        label={<img src={settingsIcon} alt="Settings" />}
        handleClick={handleOpenSettings}
        disabled={isSettingsDisabled}
        {...(styles.settingsBtn !== undefined ? { className: styles.settingsBtn } : {})}
      />
    </header>
  );
});
