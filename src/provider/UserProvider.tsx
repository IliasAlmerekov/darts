import React, { createContext, useReducer, useState } from "react";
import { PlayerProps } from "../pages/Start/Start";

interface IUserContextProps {
  userProviderEvent: {
    newPlayer: string;
    isOverlayOpen: boolean;
  };
  setUserProviderEvent: {
    setNewPlayer: React.Dispatch<React.SetStateAction<string>>;
    setIsOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  };
}

export const UserContext = createContext<IUserContextProps>({
  userProviderEvent: {
    newPlayer: "",
    isOverlayOpen: false,
  },
  setUserProviderEvent: {
    setNewPlayer: () => "",
    setIsOverlayOpen: () => false,
  },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [userProviderEvent, setUserProviderEvent] = useReducer((prev: any, next: any) => {
    const newEvent = {...prev, ...next}
// check state, run guards here
return newEvent;
},  UserContext);


const [newPlayer, setNewPlayer] = useState("");
const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  // const [isSettingsCogOpen, setIsSettingsCogOpen] = useState(false);
  // const [isSettingsOverlayOpen, setIsSettingsOverlayOpen] = useState(false);
  // const [selectedGameMode, setSelectedGameMode] = useState("single-out");
  // const [selectedPoints, setSelectedPoints] = useState(301);
  // const [deletePlayerList, setDeletePlayerList] = useState<PlayerProps[]>([]);
  // const [selectedPlayers, setSelectedPlayers] = useState<PlayerProps[]>([]);
  // const [unselectedPlayers, setUnselectedPlayers] = useState<PlayerProps[]>([]);
  // const [dragEnd, setDragEnd] = useState<boolean>();
  // const [clickedPlayerId, setClickedPlayerId] = useState<number | null>(null);
  // const [errormessage, setErrorMessage] = useState("");

  const value = {
    // state: { newPlayer, isOverlayOpen },
    // actions: { setNewPlayer, setIsOverlayOpen },
    userProviderEvent, setUserProviderEvent
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
