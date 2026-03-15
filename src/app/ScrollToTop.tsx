import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { clientLogger } from "@/shared/lib/clientLogger";

export default function ScrollToTop(): null {
  const location = useLocation();

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch (error) {
      clientLogger.warn("scroll_to_top_fallback", { error });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [location.pathname]);

  return null;
}
