type Props = {
  href?: string;
  icon?: string;
  label?: string | JSX.Element;
  handleClick?: () => void;
  className?: string;
};

function LinkButton({ href, icon, label, handleClick, className }: Props) {
  return (
    <a href={href} onClick={handleClick} className={className}>
      <img src={icon} alt="" />
      {label}
    </a>
  );
}
export default LinkButton;
