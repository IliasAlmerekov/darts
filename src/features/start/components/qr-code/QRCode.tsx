import React, { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./QRCode.module.css";

interface QRCodeProps {
  invitationLink: string;
  gameId: number | undefined;
  isLobbyFull: boolean;
  children?: React.ReactNode;
}

const QRCode: React.FC<QRCodeProps> = ({ invitationLink, gameId, isLobbyFull, children }) => {
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied" | "failed">("idle");

  const copyInvitationLink = useCallback(async (): Promise<void> => {
    if (!invitationLink) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitationLink);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = invitationLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(tempInput);
        if (!copied) {
          throw new Error("Copy command failed");
        }
      }
      setCopyFeedback("copied");
    } catch {
      setCopyFeedback("failed");
    }
  }, [invitationLink]);

  const heading = isLobbyFull ? "Room is full" : "Scan the QR code to join the game";
  const statusText = isLobbyFull ? "New players cannot join right now." : "";

  return (
    <div className={styles.qrCodeOverlay}>
      <div className={`${styles.qrCodeContainer} ${isLobbyFull ? styles.qrCodeContainerFull : ""}`}>
        <h4 className={styles.qrCodeHeading}>{heading}</h4>
        <p className={styles.qrCodeStatus} aria-live="polite">
          {statusText}
        </p>

        <div className={styles.qrCodeStage}>
          <div
            className={`${styles.qrCodeWrapper} ${isLobbyFull ? styles.qrCodeWrapperBlurred : ""}`}
          >
            <QRCodeSVG
              value={invitationLink}
              size={200}
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>

        <div className={styles.gameIdSection}>
          <span className={styles.gameIdLabel}>GAME ID</span>
          <span className={styles.gameIdValue}>#{gameId}</span>
        </div>

        <div className={styles.invitationLinkBox}>
          <button
            type="button"
            className={styles.copyButton}
            onClick={() => void copyInvitationLink()}
          >
            Copy Invite Link
          </button>
          <span className={styles.copyFeedback} aria-live="polite">
            {copyFeedback === "copied"
              ? "Copied"
              : copyFeedback === "failed"
                ? "Copy failed. Select and copy manually."
                : ""}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
};

export default React.memo(QRCode);
