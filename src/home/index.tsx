import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import "./home.css"

export type UserProps = {
    id: number,
    name: string,
}

type HomeProps = {
    list: UserProps[],
    setList: React.Dispatch<React.SetStateAction<UserProps[]>>,
}

function Home({ list, setList }: HomeProps) {
    const [isMaximumReached, setIsMaximumReached] = useState<boolean>(false);
    const [showButton, setShowButton] = useState<boolean>(false);

    const [player, setPlayer] = useState('')

    function addPlayer(name: string) {
        const newPlayer = {
            id: Date.now(),
            name,
        };

        if (!name) {
            alert("Put in a name")
        } else {
            setList(() => [...list, newPlayer]);
            setPlayer('');
        }
    }

    function deletePerson(id: number) {
        const newList = (list.filter(list => list.id !== id));
        setList(newList);
    }

    useEffect(() => {
        if (list.length === 10) {
            setIsMaximumReached(true)
            setShowButton(true)
        } else {
            setIsMaximumReached(false)
        }
    }, [list.length])

    return (
        <div>
            <div className='inputadd'><input type="text" className='Playerinput' value={player} placeholder='Choose player...' onChange={(e) => setPlayer(e.target.value)} />
                <button className="Addbutton" onClick={() => addPlayer(player)} disabled={isMaximumReached}>Add</button>
            </div>
            <div className='content'>
                <ul className="box">
                    {list.map((item: UserProps) => {
                        return <li id={item.id.toString()}> {item.name}<button className="deletebutton" onClick={() => deletePerson(item.id)}>delete</button></li>;
                    })}
                </ul>
                <Link to="/game">
                    <div className='startButton'>Start game</div>
                </Link>
            </div>
            <div className='maximumreach'>
                {isMaximumReached && showButton && (<div>
                    <p>You cannot add more players; maximum reached</p>
                    <button onClick={() => setShowButton(false)}>OK</button>
                </div>)}</div>

        </div>
    );
}
export default Home