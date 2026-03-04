import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop(): null {
  const location = useLocation();

  useEffect(() => {
    if (navigator.userAgent.includes("jsdom")) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }

    try {
      window.scrollTo(0, 0);
    } catch {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [location.pathname]);

  return null;
}
