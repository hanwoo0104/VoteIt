import { getSupabaseClient, supabase, isSupabaseConfigured } from "@/services/supabase/client";
import type { ChatMessage, ChatRoom, Politician } from "@/types";

interface PoliticianRow {
  id: string;
  user_id: string | null;
  name: string;
  party: string;
  role_title: string;
  region: string;
  avatar_url: string | null;
  online: boolean;
  status: string | null;
  tags: string[] | null;
}

interface ChatRow {
  id: string;
  user_id: string;
  politician_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

function mapPolitician(row: PoliticianRow): Politician {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    party: row.party,
    role: row.role_title,
    region: row.region,
    avatarUrl: row.avatar_url ?? "/avatars/politician-1.svg",
    online: row.online,
    status: row.status ?? "",
    tags: row.tags ?? []
  };
}

function mapRoom(row: ChatRow, politician?: Politician): ChatRoom {
  return {
    id: row.id,
    userId: row.user_id,
    politicianId: row.politician_id,
    politician,
    lastMessage: row.last_message ?? "아직 메시지가 없습니다.",
    lastMessageAt: row.last_message_at ?? new Date().toISOString(),
    unreadCount: row.unread_count
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    body: row.body,
    read: row.read,
    createdAt: row.created_at
  };
}

export async function fetchPoliticians() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("politicians")
    .select("id, user_id, name, party, role_title, region, avatar_url, online, status, tags")
    .order("online", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as PoliticianRow[]).map(mapPolitician);
}

export async function fetchChatRooms(userId: string) {
  const client = getSupabaseClient();
  const [{ data: rooms, error }, politicians] = await Promise.all([
    client
      .from("chats")
      .select("id, user_id, politician_id, last_message, last_message_at, unread_count")
      .eq("user_id", userId)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    fetchPoliticians()
  ]);

  if (error) throw new Error(error.message);
  const politiciansById = new Map(politicians.map((politician) => [politician.id, politician]));
  return ((rooms ?? []) as ChatRow[]).map((room) => mapRoom(room, politiciansById.get(room.politician_id)));
}

export async function createOrGetChatRoom(userId: string, politicianId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("chats")
    .upsert(
      {
        user_id: userId,
        politician_id: politicianId
      },
      { onConflict: "user_id,politician_id" }
    )
    .select("id, user_id, politician_id, last_message, last_message_at, unread_count")
    .single<ChatRow>();

  if (error) throw new Error(error.message);
  return mapRoom(data);
}

export async function fetchMessages(roomId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("chat_messages")
    .select("id, room_id, sender_id, body, read, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function sendChatMessage(roomId: string, senderId: string, body: string) {
  const client = getSupabaseClient();
  const { error } = await client.from("chat_messages").insert({
    room_id: roomId,
    sender_id: senderId,
    body: body.trim()
  });

  if (error) throw new Error(error.message);
}

export async function markChatRead(roomId: string, readerId: string) {
  const client = getSupabaseClient();
  const { error } = await client
    .from("chat_messages")
    .update({ read: true })
    .eq("room_id", roomId)
    .neq("sender_id", readerId);

  if (error) throw new Error(error.message);
  await client.from("chats").update({ unread_count: 0 }).eq("id", roomId).eq("user_id", readerId);
}

export function subscribeToRoomMessages(roomId: string, onMessage: (message: ChatMessage) => void) {
  if (!isSupabaseConfigured || !supabase) return () => undefined;

  const client = supabase;
  const channel = client
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`
      },
      (payload) => onMessage(mapMessage(payload.new as MessageRow))
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
