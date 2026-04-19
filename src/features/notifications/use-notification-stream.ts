import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthState } from "@/features/auth/hooks";
import { authStore } from "@/features/auth/store";
import { buildApiUrl, queryClient } from "@/shared/api";
import type { AccountNotificationResponse } from "./model";
import { notificationQueryKeys } from "./queryKeys";

const RECONNECT_DELAY_MS = 3_000;

export function parseEventBlock(block: string) {
  const lines = block.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return {
    event,
    data: dataLines.join("\n"),
  };
}

export function useNotificationStream(enabled = true) {
  const auth = useAuthState();
  const seenIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled || !auth.accessToken) {
      return;
    }

    let cancelled = false;
    let reconnectTimer: number | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const controller = new AbortController();
    const decoder = new TextDecoder();

    const scheduleReconnect = () => {
      if (cancelled) {
        return;
      }
      reconnectTimer = window.setTimeout(() => {
        void connect();
      }, RECONNECT_DELAY_MS);
    };

    const handleNotification = (notification: AccountNotificationResponse) => {
      if (seenIdsRef.current.has(notification.notificationId)) {
        return;
      }

      seenIdsRef.current.add(notification.notificationId);
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      toast(notification.title, {
        description: notification.body,
      });
    };

    const processBuffer = (buffer: string) => {
      let remaining = buffer;
      let separatorIndex = remaining.indexOf("\n\n");

      while (separatorIndex !== -1) {
        const block = remaining.slice(0, separatorIndex).replace(/\r/g, "");
        remaining = remaining.slice(separatorIndex + 2);

        if (block.trim()) {
          const parsed = parseEventBlock(block);
          if (parsed.event === "notification" && parsed.data) {
            try {
              handleNotification(JSON.parse(parsed.data) as AccountNotificationResponse);
            } catch {
              // Ignore malformed stream payloads and let the next event continue.
            }
          }
        }

        separatorIndex = remaining.indexOf("\n\n");
      }

      return remaining;
    };

    const connect = async () => {
      try {
        const response = await fetch(buildApiUrl("/notifications/stream"), {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${auth.accessToken}`,
            // Prevent ngrok free interstitial HTML (ERR_NGROK_6024) from breaking CORS.
            // This header is harmless for normal origins.
            "ngrok-skip-browser-warning": "true",
          },
          signal: controller.signal,
          credentials: "include",
        });

        if (!response.ok || !response.body) {
          if (response.status === 401) {
            authStore.clearAuth();
            return;
          }
          throw new Error(`Notification stream failed with status ${response.status}`);
        }

        reader = response.body.getReader();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          buffer = processBuffer(buffer);
        }

        if (!cancelled) {
          scheduleReconnect();
        }
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
      void reader?.cancel();
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [auth.accessToken, enabled]);
}
