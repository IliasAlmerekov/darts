import { createContext, useContext, useReducer } from "react";

const UserContext = createContext();

const initialValues = {
  newPlayer: "",
  isOverlayOpen: false,
  selectedPlayers: [], /* <PlayerProps[]> */
  unselectedPlayers: [], /* <PlayerProps[]> */
  dragEnd: undefined, /* <boolean> */
  clickedPlayerId: null, /* <number | null> */
  errormessage: "",
  activeTab: "game",
};

const reducer = (prev, next) => {
  const newEvent = { ...prev, ...next };
  // guards
  return newEvent;
};

export const UserProvider = ({ children }) => {
  const [event, updateEvent] = useReducer(reducer, initialValues);

  // logic here...
  function handleTabClick(id) {
    updateEvent({ activeTab: id });
  }

  const functions = { handleTabClick };

  return (
    <UserContext.Provider
      value={{
        event,
        updateEvent,
        functions
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
