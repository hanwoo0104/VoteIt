import { supabase, isSupabaseConfigured } from "@/services/supabase/client";
import type { ChatMessage } from "@/types";

export function subscribeToChatRoom(roomId: string, onMessage: (message: ChatMessage) => void) {
  if (!isSupabaseConfigured || !supabase) {
    return () => undefined;
  }

  const client = supabase;
  const channel = client
    .channel(`chat:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          room_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read: boolean;
        };
        onMessage({
          id: row.id,
          roomId: row.room_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
          read: row.read
        });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
