import React from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./QRCode.module.css";

interface QRCodeProps {
  invitationLink: string;
  gameId: number | undefined;
  children?: React.ReactNode;
}

const QRCode: React.FC<QRCodeProps> = ({ invitationLink, gameId, children }) => {
  return (
    <div className={styles.qrCodeOverlay}>
      <div className={styles.qrCodeContainer}>
        <h4 className={styles.qrCodeHeading}>Scan the QR code to join the game:</h4>

        <div className={styles.qrCodeWrapper}>
          <QRCodeSVG
            value={invitationLink}
            size={200}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <div className={styles.gameIdSection}>
          <span className={styles.gameIdLabel}>GAME ID</span>
          <span className={styles.gameIdValue}>#{gameId}</span>
        </div>

        <div className={styles.invitationLinkBox}>
          <input
            type="text"
            value={invitationLink}
            readOnly
            className={styles.invitationLinkInput}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
        {children}
      </div>
    </div>
  );
};

export default QRCode;
