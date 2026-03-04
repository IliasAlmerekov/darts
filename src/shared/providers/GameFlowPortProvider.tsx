import React, { createContext, useContext, useMemo } from "react";
import { defaultGameFlowPort, type GameFlowPort } from "@/shared/ports/game-flow";

const GameFlowPortContext = createContext<GameFlowPort | null>(null);

interface GameFlowPortProviderProps {
  children: React.ReactNode;
  port?: GameFlowPort;
}

export function GameFlowPortProvider({
  children,
  port = defaultGameFlowPort,
}: GameFlowPortProviderProps): React.JSX.Element {
  const value = useMemo(() => port, [port]);

  return <GameFlowPortContext.Provider value={value}>{children}</GameFlowPortContext.Provider>;
}

export function useGameFlowPort(): GameFlowPort {
  const context = useContext(GameFlowPortContext);
  if (!context) {
    throw new Error("useGameFlowPort must be used within GameFlowPortProvider");
  }
  return context;
}
