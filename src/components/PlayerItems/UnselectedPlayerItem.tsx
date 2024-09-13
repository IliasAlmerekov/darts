import './PlayerItems.css'


type Props = {
    name: any;
    isAdded?: boolean;
    handleClickOrDelete: () => void;
    src: any;
    alt?: string;
}

function UnselectedPlayerItem({ ...props }: Props) {

    return (
        <div className="unselectedPlayerItem">
            <div>{props?.name}</div>
            <img src={props.src} alt={props.alt} onClick={props.handleClickOrDelete} />
        </div>
    )

}
export default UnselectedPlayerItem