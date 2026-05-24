"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, CheckCheck, Circle, Send, Video } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPoliticianById, politicians } from "@/services/data/mockData";
import { subscribeToChatRoom } from "@/services/chat/realtime";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { cn, formatTime, relativeTime } from "@/lib/utils";

export function ChatPage() {
  const rooms = useChatStore((state) => state.rooms);
  const activeRoomId = useChatStore((state) => state.activeRoomId);
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const messages = useChatStore((state) => state.messagesByRoom[activeRoomId] ?? []);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const user = useAuthStore((state) => state.user);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const activePolitician = activeRoom ? getPoliticianById(activeRoom.politicianId) : politicians[0];

  useEffect(() => {
    if (!activeRoomId) return;
    return subscribeToChatRoom(activeRoomId, () => undefined);
  }, [activeRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeRoomId, messages.length]);

  const submit = () => {
    if (!draft.trim() || !activeRoom) return;
    sendMessage(activeRoom.id, "demo-user", draft);
    setDraft("");
    window.setTimeout(() => {
      sendMessage(
        activeRoom.id,
        activeRoom.politicianId,
        "좋은 질문이에요. 이 사안은 찬반보다 실행 조건이 중요해서, 관련 자료를 근거로 다시 정리해 드릴게요."
      );
    }, 900);
  };

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [rooms]
  );

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

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[330px_1fr] md:grid-rows-1">
        <aside className="hide-scrollbar flex gap-3 overflow-x-auto border-b border-slate-100 bg-white px-5 py-3 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
          {sortedRooms.map((room) => {
            const politician = getPoliticianById(room.politicianId);
            if (!politician) return null;
            const active = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
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
                    <span className={cn("text-[10px] font-bold", active ? "text-white/65" : "text-slate-400")}>
                      {relativeTime(room.lastMessageAt)}
                    </span>
                  </div>
                  <p className={cn("mt-1 truncate text-xs font-medium", active ? "text-white/70" : "text-slate-500")}>
                    {room.lastMessage}
                  </p>
                </div>
                {room.unreadCount > 0 ? (
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
                  const mine = message.senderId === "demo-user";
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
                            mine
                              ? "rounded-br-md bg-vote-blue text-white"
                              : "rounded-bl-md bg-white text-vote-ink"
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
                {!user ? (
                  <p className="mb-2 rounded-2xl bg-vote-red/10 px-3 py-2 text-xs font-bold text-vote-red">
                    로그인하면 실시간 채팅방을 생성할 수 있어요. 지금은 데모 메시지로 시연됩니다.
                  </p>
                ) : null}
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
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
