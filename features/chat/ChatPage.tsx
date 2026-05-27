"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, CheckCheck, Circle, Send, Video } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { RequireAuth } from "@/features/auth/RequireAuth";
import {
  createOrGetChatRoom,
  fetchChatRooms,
  fetchMessages,
  fetchPoliticians,
  markChatRead,
  sendChatMessage,
  subscribeToRoomMessages
} from "@/services/chat/chatService";
import { useAuthStore } from "@/stores/authStore";
import { cn, formatTime, relativeTime } from "@/lib/utils";
import type { ChatMessage, ChatRoom, Politician } from "@/types";

export function ChatPage() {
  return (
    <RequireAuth>
      <ChatContent />
    </RequireAuth>
  );
}

function ChatContent() {
  const user = useAuthStore((state) => state.user);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((room) => room.id === activeRoomId);
  const activePolitician = activeRoom?.politician;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const loadedPoliticians = await fetchPoliticians();
      setPoliticians(loadedPoliticians);
      if (user) {
        const loadedRooms = await fetchChatRooms(user.id);
        setRooms(loadedRooms);
        setActiveRoomId((current) => current || loadedRooms[0]?.id || "");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "채팅 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!activeRoomId || !user) {
      setMessages([]);
      return;
    }

    fetchMessages(activeRoomId)
      .then(setMessages)
      .then(() => markChatRead(activeRoomId, user.id))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "메시지를 불러오지 못했습니다."));

    const unsubscribe = subscribeToRoomMessages(activeRoomId, (message) => {
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      markChatRead(activeRoomId, user.id).catch(() => undefined);
    });

    return unsubscribe;
  }, [activeRoomId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeRoomId, messages.length]);

  const openRoom = async (politician: Politician) => {
    if (!user) return;
    try {
      const existing = rooms.find((room) => room.politicianId === politician.id);
      const room = existing ?? { ...(await createOrGetChatRoom(user.id, politician.id)), politician };
      setRooms((current) => (current.some((item) => item.id === room.id) ? current : [room, ...current]));
      setActiveRoomId(room.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "채팅방을 만들지 못했습니다.");
    }
  };

  const submit = async () => {
    if (!draft.trim() || !activeRoom || !user) return;
    const optimistic: ChatMessage = {
      id: `optimistic-${crypto.randomUUID()}`,
      roomId: activeRoom.id,
      senderId: user.id,
      body: draft.trim(),
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages((current) => [...current, optimistic]);
    setDraft("");

    try {
      await sendChatMessage(activeRoom.id, user.id, optimistic.body);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "메시지 전송에 실패했습니다.");
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
    }
  };

  const sortedPoliticians = useMemo(
    () => [...politicians].sort((a, b) => Number(b.online) - Number(a.online)),
    [politicians]
  );

  if (!user) return null;

  return (
    <AppShell showHeader={false} className="flex h-dvh flex-col px-0 pb-0">
      <div className="border-b border-slate-100 bg-white/90 px-5 pt-[calc(18px+env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-3xl font-black text-vote-ink">채팅</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">정치인 계정과 1:1로 소통</p>
          </div>
          <Button size="icon" variant="soft">
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-5">
          <ShimmerLoader text="채팅방을 불러오는 중..." />
        </div>
      ) : error ? (
        <div className="px-5 py-5">
          <ErrorState description={error} onRetry={load} />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[330px_1fr] md:grid-rows-1">
          <aside className="hide-scrollbar flex gap-3 overflow-x-auto border-b border-slate-100 bg-white px-5 py-3 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {sortedPoliticians.map((politician) => {
              const room = rooms.find((item) => item.politicianId === politician.id);
              const active = room?.id === activeRoomId;
              return (
                <button
                  key={politician.id}
                  onClick={() => openRoom(politician)}
                  className={cn(
                    "flex min-w-[260px] items-center gap-3 rounded-3xl p-3 text-left transition md:min-w-0",
                    active ? "bg-vote-blue text-white shadow-soft" : "bg-slate-50 text-vote-ink hover:bg-slate-100"
                  )}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white/40">
                    <Image src={politician.avatarUrl} alt={politician.name} fill sizes="48px" className="object-cover" />
                    <span className={cn("absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white", politician.online ? "bg-emerald-400" : "bg-slate-300")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black">{politician.name}</p>
                      {room ? (
                        <span className={cn("text-[10px] font-bold", active ? "text-white/65" : "text-slate-400")}>
                          {relativeTime(room.lastMessageAt)}
                        </span>
                      ) : null}
                    </div>
                    <p className={cn("mt-1 truncate text-xs font-medium", active ? "text-white/70" : "text-slate-500")}>
                      {room?.lastMessage ?? politician.status}
                    </p>
                  </div>
                  {room && room.unreadCount > 0 ? (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-vote-red px-1.5 text-[10px] font-black text-white">
                      {room.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </aside>

          <section className="flex min-h-0 flex-col bg-[#f4f7fb]">
            {activePolitician && activeRoom ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-3">
                  <button className="md:hidden" aria-label="뒤로">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="relative h-11 w-11 overflow-hidden rounded-2xl">
                    <Image src={activePolitician.avatarUrl} alt={activePolitician.name} fill sizes="44px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-vote-ink">{activePolitician.name}</p>
                    <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <Circle className={cn("h-2 w-2 fill-current", activePolitician.online ? "text-emerald-400" : "text-slate-300")} />
                      {activePolitician.party} · {activePolitician.status}
                    </p>
                  </div>
                </div>

                <div className="ios-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  {messages.map((message, index) => {
                    const mine = message.senderId === user.id;
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: Math.min(index * 0.03, 0.2) }}
                        className={cn("flex", mine ? "justify-end" : "justify-start")}
                      >
                        <div className={cn("max-w-[78%]", mine ? "items-end" : "items-start")}>
                          <div
                            className={cn(
                              "rounded-[24px] px-4 py-3 text-[15px] leading-relaxed shadow-sm",
                              mine ? "rounded-br-md bg-vote-blue text-white" : "rounded-bl-md bg-white text-vote-ink"
                            )}
                          >
                            {message.body}
                          </div>
                          <div className={cn("mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400", mine && "justify-end")}>
                            <span>{formatTime(message.createdAt)}</span>
                            {mine ? <CheckCheck className="h-3.5 w-3.5 text-vote-blue" /> : null}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-slate-100 bg-white px-5 pb-[calc(92px+env(safe-area-inset-bottom))] pt-3 md:pb-5">
                  <div className="flex gap-2">
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") submit();
                      }}
                      placeholder="메시지 보내기"
                      className="rounded-full bg-slate-50"
                    />
                    <Button size="icon" variant="red" onClick={submit} disabled={!draft.trim()}>
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="px-5 py-5">
                <EmptyState title="정치인을 선택해 주세요" description="왼쪽 목록에서 채팅할 정치인을 선택하면 채팅방이 생성됩니다." />
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
