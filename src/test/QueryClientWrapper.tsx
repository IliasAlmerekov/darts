import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/shared/query/queryClient";

/** A `render` or `renderHook` wrapper that gives each mount its own query client. */
export function QueryClientWrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
