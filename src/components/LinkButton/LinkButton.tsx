
type Props = {
    href?: string
    icon?: string
    label?: string
    handleClick?: () => void;
    className?: string;
}

function LinkButton({ ...props }: Props) {
    return (<a href={props.href} onClick={props.handleClick} className={props.className} ><img src={props.icon} alt="" />{props.label}</a>)
}
export default LinkButton