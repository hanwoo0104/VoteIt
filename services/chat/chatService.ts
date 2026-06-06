import { apiFetch } from "@/services/api/http";
import type { ChatMessage, ChatRoom, Politician } from "@/types";

export async function fetchPoliticians() {
  return apiFetch<Politician[]>("/api/politicians");
}

export async function fetchChatRooms(_userId: string) {
  return apiFetch<ChatRoom[]>("/api/chats");
}

export async function createOrGetChatRoom(_userId: string, politicianId: string) {
  return apiFetch<ChatRoom>("/api/chats", {
    method: "POST",
    body: JSON.stringify({ politicianId })
  });
}

export async function fetchMessages(roomId: string) {
  return apiFetch<ChatMessage[]>(`/api/chats/${encodeURIComponent(roomId)}/messages`);
}

export async function sendChatMessage(roomId: string, _senderId: string, body: string) {
  await apiFetch<{ ok: true }>(`/api/chats/${encodeURIComponent(roomId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

export async function markChatRead(roomId: string, _readerId: string) {
  await apiFetch<{ ok: true }>(`/api/chats/${encodeURIComponent(roomId)}/read`, { method: "POST" });
}

export function subscribeToRoomMessages(roomId: string, onMessage: (message: ChatMessage) => void) {
  let active = true;
  let knownIds = new Set<string>();

  fetchMessages(roomId)
    .then((messages) => {
      knownIds = new Set(messages.map((message) => message.id));
    })
    .catch(() => undefined);

  const timer = window.setInterval(() => {
    if (!active) return;
    fetchMessages(roomId)
      .then((messages) => {
        for (const message of messages) {
          if (!knownIds.has(message.id)) {
            knownIds.add(message.id);
            onMessage(message);
          }
        }
      })
      .catch(() => undefined);
  }, 2500);

  return () => {
    active = false;
    window.clearInterval(timer);
  };
}
