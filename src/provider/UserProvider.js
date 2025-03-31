import { createContext, useContext, useReducer } from "react";

const UserContext = createContext();

const initialValues = {
  newPlayer: "",
  isOverlayOpen: false
};

const reducer = (prev, next) => {
  const newEvent = { ...prev, ...next };
  // guards
  return newEvent;
};

export const UserProvider = ({ children }) => {
  const [event, updateEvent] = useReducer(reducer, initialValues);

  // logic here...

  return (
    <UserContext.Provider
      value={{
        event,
        updateEvent,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
