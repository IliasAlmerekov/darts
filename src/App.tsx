import React, { useEffect, useState } from 'react';
import './App.css';


function App() {
  const [list, setList] = useState<Array<{ id: number, title: string }>>([]);
  const [isMaximumReached, setIsMaximumReached] = useState<boolean>(false);
  const [showButton, setShowButton] = useState<boolean>(false);

  const [title, setTitle] = useState('')

  function addName(title: string) {
    const newPerson = {
      id: Date.now(),
      title,
    };

    if (!title) {
      alert("Put in a name")
    } else {
      setList(() => [...list, newPerson]);
      setTitle('');
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
    <div className="App">
      <div><input type="text" className='Playerinput' value={title} placeholder='Choose player...' onChange={(e) => setTitle(e.target.value)} />
        <button className="Addbutton" onClick={() => addName(title)} disabled={isMaximumReached}>Add</button>
      </div>
      <div className='content'>
        <ul className="Todobox">
          {list.map((item: { id: number; title: string; }) => {
            return <li id={item.id.toString()}> {item.title}<button className="deletebutton" onClick={() => deletePerson(item.id)}>delete</button></li>;
          })}
        </ul>
        <div className='startButton'>Start game</div>
      </div>
      {isMaximumReached && showButton && (<div>
        <p>You cannot add more players; maximum reached</p>
        <button onClick={() => setShowButton(false)}>OK</button>
      </div>)}

    </div>
  );
}

export default App;
