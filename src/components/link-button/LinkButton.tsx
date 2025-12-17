type Props = {
  href?: string;
  icon?: string;
  label?: string | JSX.Element;
  handleClick?: () => void;
  className?: string;
  disabled?: boolean;
};

function LinkButton({ href, icon, label, handleClick, className, disabled }: Props) {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (handleClick) {
      handleClick();
    }
  };

  return (
    <a
      href={href}
      onClick={handleLinkClick}
      className={className}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      aria-disabled={disabled}
    >
      <img src={icon} alt="" />
      {label}
    </a>
  );
}
export default LinkButton;
