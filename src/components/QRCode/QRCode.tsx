import React from "react";
import { QRCodeSVG } from "qrcode.react";
import "./QRCode.css";

interface QRCodeProps {
  invitationLink: string;
  gameId: number | undefined;
}

const QRCode: React.FC<QRCodeProps> = ({ invitationLink, gameId }) => {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      alert("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback für ältere Browser
      const textArea = document.createElement("textarea");
      textArea.value = invitationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Link copied!");
    }
  };

  return (
    <div className="qr-code-overlay">
      <div className="qr-code-container">
        <h2 className="qr-code-heading">Game Created!</h2>
        <p className="qr-code-subheading">
          Game ID: <strong>#{gameId}</strong>
        </p>

        <div className="qr-code-wrapper">
          <QRCodeSVG
            value={invitationLink}
            size={256}
            level="H"
            includeMargin={true}
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
          <button onClick={handleCopyLink} className="copy-link-button" title="Copy link">
            📋 Copy
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCode;
