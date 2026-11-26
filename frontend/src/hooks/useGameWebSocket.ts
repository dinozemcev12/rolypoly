import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useGameStore } from "@/store/useGameStore";
import type { Notification } from "@/types";

export function useGameWebSocket(gameId: number | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const { token } = useAuthStore();
  const { addNotification, setCurrentGame, currentGame } = useGameStore();

  const connect = useCallback(() => {
    if (!gameId || !token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `ws://127.0.0.1:8000/ws/${gameId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[WS] Connected to game ${gameId}`);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleMessage(msg);
      } catch {}
    };

    ws.onclose = () => {
      console.log(`[WS] Disconnected from game ${gameId}`);
      // Reconnect after 5s
      setTimeout(() => {
        if (wsRef.current === ws) {
          connect();
        }
      }, 5000);
    };

    ws.onerror = (err) => {
      console.warn("[WS] Error:", err);
    };

    wsRef.current = ws;
  }, [gameId, token]);

  const handleMessage = useCallback((msg: any) => {
    switch (msg.event) {
      case "notification": {
        const n = msg.data as Notification;
        addNotification(n);
        break;
      }
      case "turn_update": {
        // Обновление хода — перезагрузить игру
        if (msg.data && currentGame) {
          setCurrentGame({ ...currentGame, ...msg.data });
        }
        break;
      }
      case "order_update": {
        // Можно перезагрузить orders при необходимости
        break;
      }
      default:
        break;
    }
  }, [addNotification, currentGame, setCurrentGame]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
