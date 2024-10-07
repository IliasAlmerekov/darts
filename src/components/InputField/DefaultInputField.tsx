import './DefaultInputField.css'

type Props = {
    placeholder: string;
    value: any;
    onChange: any;
}

function DefaultInputField({ ...props }: Props) {
    return <input value={props.value} placeholder={props.placeholder} onChange={props.onChange} className="defaultInputField copylarge" />
}
export default DefaultInputField