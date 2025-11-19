import React from "react";
import { QRCodeSVG } from "qrcode.react";
import "./QRCode.css";

interface QRCodeProps {
  invitationLink: string;
  gameId: number | undefined;
}

const QRCode: React.FC<QRCodeProps> = ({ invitationLink, gameId }) => {
  return (
    <div className="qr-code-overlay">
      <div className="qr-code-container">
        <p className="qr-code-subheading">Scan the QR code to join the game:</p>
        <p className="qr-code-subheading">
          Game ID: <strong>#{gameId}</strong>
        </p>

        <div className="qr-code-wrapper">
          <QRCodeSVG
            value={invitationLink}
            size={256}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <div className="invitation-link-box">
          <input
            type="text"
            value={invitationLink}
            readOnly
            className="invitation-link-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      </div>
    </div>
  );
};

export default QRCode;
