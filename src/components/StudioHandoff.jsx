import React, { useEffect, useRef, useState } from "react";
import { startStudioHandoff } from "../api";

export default function StudioHandoff() {
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const challenge = params.get("challenge");
    const state = params.get("state");
    if (!/^[A-Za-z0-9_-]{43}$/.test(state || "")) {
      setError("Invalid Studio sign-in request.");
      return;
    }
    startStudioHandoff(challenge).then(({ data }) => {
      const callback = new URL(data.callback);
      const expected = new URL(import.meta.env.VITE_INVITATION_APP_URL || "http://localhost:5174");
      if (callback.origin !== expected.origin || callback.pathname !== "/handoff") {
        setError("Invitation Studio’s address does not match the Planner configuration.");
        return;
      }
      callback.hash = new URLSearchParams({ code: data.code, state }).toString();
      window.location.replace(callback.href);
    }).catch((error) => {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        setError("Your Planner session could not be verified. Return to Planner and sign in again.");
      } else if (status === 429) {
        setError("Too many Studio sign-in attempts. Wait a minute and try again.");
      } else {
        setError("Invitation Studio could not start. Return to Planner and try again.");
      }
    });
  }, []);
  return <main className="page-loading">{error ? <div><p>{error}</p><a href="/">Return to Planner</a></div> : "Opening Invitation Studio…"}</main>;
}
