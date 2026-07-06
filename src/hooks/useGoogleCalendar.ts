import { useState, useEffect, useCallback } from "react";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  GoogleCalendarStatus,
} from "../lib/tauri-commands";

export function useGoogleCalendar() {
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(
    null,
  );
  const [calendarUrl, setCalendarUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!calendarUrl.trim()) {
      setConnectionError("Please enter a valid iCal/ICS URL.");
      return;
    }
    setIsConnecting(true);
    setConnectionError(null);
    try {
      await connectGoogleCalendar(calendarUrl.trim());
      setGoogleStatus({ connected: true, url: calendarUrl.trim() });
    } catch (e) {
      setConnectionError(String(e));
    } finally {
      setIsConnecting(false);
    }
  }, [calendarUrl]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectGoogleCalendar();
      setGoogleStatus({ connected: false });
      setCalendarUrl("");
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    getGoogleCalendarStatus()
      .then((status) => {
        setGoogleStatus(status);
        if (status.connected && status.url) {
          setCalendarUrl(status.url);
        }
      })
      .catch(console.error);
  }, []);

  return {
    googleStatus,
    calendarUrl,
    setCalendarUrl,
    isConnecting,
    connectionError,
    handleConnect,
    handleDisconnect,
  };
}
