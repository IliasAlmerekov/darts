

type Props = {
    href?: string
    icon: string
    label: string
    handleClick: () => void;
}

function Link({ ...props }: Props) {
    return (<a href={props.href} onClick={props.handleClick} className="link" ><img src={props.icon} alt="" />{props.label}</a>)
}
export default Link