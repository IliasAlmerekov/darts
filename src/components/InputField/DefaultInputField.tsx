import './DefaultInputField.css'

type Props = {
    placeholder: string;
    value: any;
    onChange: any;
    onKeyDown(name: any): (e: any) => void
}

function DefaultInputField({ ...props }: Props) {
    return <input onKeyDown={props.onKeyDown(props.onChange)} autoFocus value={props.value} placeholder={props.placeholder} onChange={props.onChange} className="copylarge defaultInputField" />
}
export default DefaultInputField