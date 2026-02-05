import React from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "./QRCode.module.css";

interface QRCodeProps {
  invitationLink: string;
  gameId: number | undefined;
}

const QRCode: React.FC<QRCodeProps> = ({ invitationLink, gameId }) => {
  return (
    <div className={styles.qrCodeOverlay}>
      <div className={styles.qrCodeContainer}>
        <p className={styles.qrCodeSubheading}>Scan the QR code to join the game:</p>
        <p className={styles.qrCodeSubheading}>
          Game ID: <strong>#{gameId}</strong>
        </p>

        <div className={styles.qrCodeWrapper}>
          <QRCodeSVG
            value={invitationLink}
            size={160}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
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
      </div>
    </div>
  );
};

export default QRCode;
