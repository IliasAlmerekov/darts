import clsx from "clsx";
import { Link } from "react-router-dom";

export interface ButtonProps {
    isLink?: boolean;
    href?: string | any
    target?: string
    isInverted?: boolean
    iconSrc?: any
    handleClick?: () => void
    label?: string
    class?: string
    type?: 'primary' | 'secondary';
    className?: string;
    iconStyling?: string
    link?: any
    alt?: string;
    disabled?: boolean;
}


function Button({ ...props }: ButtonProps) {
    if (!props.type) {
        props.type = "primary"
    }
    if (!props.isLink) {
        return (
            <button className={clsx(props?.className, "btn h4", {
                ["btnPrimary"]: props.type === 'primary' && !props.isInverted,
                ["btnSecondary"]: props.type === 'secondary' && !props.isInverted,
                ["inverted"]: props.isInverted && props.type !== "secondary",
                ["invertedSecondary"]: props.isInverted && props.type === "secondary",
                ["disabled"]: props.disabled,

            })} onClick={props.handleClick}>
                {props.iconSrc && <img src={props?.iconSrc} alt={props?.alt} className={props.iconStyling} />}
                {props?.label}</button>
        )
    } else {
        return (
            <Link className="noUnderline" to={props.disabled ? null : props.link}>
                <button className={clsx(props?.className, "btn", {
                    ["btnPrimary"]: props.type === 'primary' && !props.isInverted,
                    ["btnSecondary"]: props.type === 'secondary' && !props.isInverted,
                    ["inverted"]: props.isInverted && props.type !== "secondary",
                    ["invertedSecondary"]: props.isInverted && props.type === "secondary",
                    ["disabled"]: props.disabled,

                })} onClick={props.handleClick}>
                    {props.iconSrc && <img src={props?.iconSrc} alt={props?.alt} className={props.iconStyling} />}
                    {props?.label}</button>
            </Link>
        )
    }
}
export default Button