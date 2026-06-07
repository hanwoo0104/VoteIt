"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCheck, MessageCircle, MoreVertical, Plus, Search, Send, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { RequireAuth } from "@/features/auth/RequireAuth";
import {
  createOrGetChatRoom,
  deleteChatRoom,
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

export function ChatPage({ initialRoomId = "" }: { initialRoomId?: string }) {
  return (
    <RequireAuth>
      <ChatContent initialRoomId={initialRoomId} />
    </RequireAuth>
  );
}

function ChatContent({ initialRoomId }: { initialRoomId: string }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeRoomId, setActiveRoomId] = useState(initialRoomId);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [openingPoliticianId, setOpeningPoliticianId] = useState("");
  const [deletingRoomId, setDeletingRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((room) => room.id === activeRoomId);
  const activePolitician = activeRoom?.politician;

  const load = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      setError("");
      try {
        const [loadedPoliticians, loadedRooms] = await Promise.all([fetchPoliticians(), fetchChatRooms(user.id)]);
        setPoliticians(loadedPoliticians);
        setRooms(loadedRooms);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "채팅 정보를 불러오지 못했습니다.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    setActiveRoomId(initialRoomId);
    setNewChatOpen(false);
  }, [initialRoomId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeRoomId || !user) {
      setMessages([]);
      setMessageLoading(false);
      return;
    }

    let active = true;
    setMessageLoading(true);
    fetchMessages(activeRoomId)
      .then((loadedMessages) => {
        if (!active) return;
        setMessages(loadedMessages);
        setRooms((current) => current.map((room) => (room.id === activeRoomId ? { ...room, unreadCount: 0 } : room)));
        return markChatRead(activeRoomId, user.id);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "메시지를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setMessageLoading(false);
      });

    const unsubscribe = subscribeToRoomMessages(activeRoomId, (message) => {
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      setRooms((current) => current.map((room) => (room.id === activeRoomId ? { ...room, unreadCount: 0, lastMessage: message.body, lastMessageAt: message.createdAt } : room)));
      markChatRead(activeRoomId, user.id).catch(() => undefined);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeRoomId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeRoomId, messages.length]);

  const filteredPoliticians = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return [...politicians]
      .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"))
      .filter((politician) => {
        if (!keyword) return true;
        return `${politician.name} ${politician.party}`.toLowerCase().includes(keyword);
      });
  }, [politicians, query]);

  const openRoomByRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setNewChatOpen(false);
    router.push(`/chat/${roomId}`);
  };

  const openRoomByPolitician = async (politician: Politician) => {
    if (!user) return;
    setOpeningPoliticianId(politician.id);
    setError("");
    try {
      const existing = rooms.find((room) => room.politicianId === politician.id);
      const room = existing ?? (await createOrGetChatRoom(user.id, politician.id));
      const hydratedRoom = { ...room, politician: room.politician ?? politician };
      setRooms((current) => {
        const next = current.filter((item) => item.id !== hydratedRoom.id);
        return [hydratedRoom, ...next];
      });
      setNewChatOpen(false);
      setActiveRoomId(hydratedRoom.id);
      router.push(`/chat/${hydratedRoom.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "채팅방을 만들지 못했습니다.");
    } finally {
      setOpeningPoliticianId("");
    }
  };

  const submit = async () => {
    if (!draft.trim() || !activeRoom || !user) return;
    const body = draft.trim();
    const optimistic: ChatMessage = {
      id: `optimistic-${crypto.randomUUID()}`,
      roomId: activeRoom.id,
      senderId: user.id,
      body,
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages((current) => [...current, optimistic]);
    setRooms((current) => current.map((room) => (room.id === activeRoom.id ? { ...room, lastMessage: body, lastMessageAt: optimistic.createdAt } : room)));
    setDraft("");

    try {
      await sendChatMessage(activeRoom.id, user.id, body);
      const loadedMessages = await fetchMessages(activeRoom.id);
      setMessages(loadedMessages);
      await load(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "메시지 전송에 실패했습니다.");
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
    }
  };

  const backToList = () => {
    setActiveRoomId("");
    setMessages([]);
    router.push("/chat");
  };

  const removeRoom = async (roomId: string) => {
    setDeletingRoomId(roomId);
    setError("");
    try {
      await deleteChatRoom(roomId);
      setRooms((current) => current.filter((room) => room.id !== roomId));
      if (activeRoomId === roomId) backToList();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "채팅방 삭제에 실패했습니다.");
    } finally {
      setDeletingRoomId("");
    }
  };

  if (!user) return null;

  return (
    <AppShell showHeader={false} className="flex min-h-dvh flex-col px-0 pb-0">
      {!activeRoomId ? (
        <ChatListHeader newChatOpen={newChatOpen} onBack={() => setNewChatOpen(false)} onNewChat={() => setNewChatOpen(true)} />
      ) : null}

      {loading ? (
        <div className="px-5 py-5">
          <ShimmerLoader text="채팅 정보를 불러오는 중..." />
        </div>
      ) : error ? (
        <div className="px-5 py-5">
          <ErrorState description={error} onRetry={() => load()} />
        </div>
      ) : activeRoomId ? (
        <ChatRoomView
          activeRoomId={activeRoomId}
          activeRoom={activeRoom}
          activePolitician={activePolitician}
          messages={messages}
          userId={user.id}
          draft={draft}
          setDraft={setDraft}
          submit={submit}
          messageLoading={messageLoading}
          onBack={backToList}
          bottomRef={bottomRef}
        />
      ) : newChatOpen ? (
        <NewChatView politicians={filteredPoliticians} rooms={rooms} query={query} setQuery={setQuery} openingPoliticianId={openingPoliticianId} onOpenRoom={openRoomByPolitician} />
      ) : (
        <RoomListView rooms={rooms} deletingRoomId={deletingRoomId} onOpenRoom={openRoomByRoom} onDeleteRoom={removeRoom} onNewChat={() => setNewChatOpen(true)} />
      )}
    </AppShell>
  );
}

function ChatListHeader({
  newChatOpen,
  onBack,
  onNewChat
}: {
  newChatOpen: boolean;
  onBack: () => void;
  onNewChat: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-5 pt-[calc(18px+env(safe-area-inset-top))] backdrop-blur-2xl">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          {newChatOpen ? (
            <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100" aria-label="채팅 목록으로 돌아가기">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div>
            <h1 className="text-3xl font-black text-vote-ink">{newChatOpen ? "새 채팅" : "채팅"}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{newChatOpen ? "정치인을 검색해 DM을 시작하세요" : "정치인과 나눈 대화"}</p>
          </div>
        </div>
        {!newChatOpen ? (
          <Button size="icon" variant="soft" onClick={onNewChat} aria-label="새 채팅">
            <Plus className="h-5 w-5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RoomListView({
  rooms,
  deletingRoomId,
  onOpenRoom,
  onDeleteRoom,
  onNewChat
}: {
  rooms: ChatRoom[];
  deletingRoomId: string;
  onOpenRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onNewChat: () => void;
}) {
  const [menuRoomId, setMenuRoomId] = useState("");

  if (rooms.length === 0) {
    return (
      <div className="flex flex-1 items-center px-5 py-10">
        <div className="w-full">
          <EmptyState title="아직 채팅한 정치인이 없습니다" description="오른쪽 위 새 채팅 버튼으로 첫 DM을 시작해 보세요." />
          <Button variant="primary" className="mt-3 w-full" onClick={onNewChat}>
            새 채팅 시작
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-scroll flex-1 overflow-y-auto px-5 py-3">
      <div className="space-y-1">
        {rooms.map((room, index) => {
          const menuOpen = menuRoomId === room.id;
          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.18) }}
              className="relative flex items-center gap-2 rounded-3xl p-2 transition hover:bg-slate-50"
            >
              <button type="button" onClick={() => onOpenRoom(room.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-left transition active:scale-[0.99]">
                <PoliticianAvatar politician={room.politician} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-black text-vote-ink">{room.politician?.name ?? "정치인"}</p>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">{relativeTime(room.lastMessageAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-500">{room.lastMessage}</p>
                  <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{room.politician?.party ?? "정당"}</p>
                </div>
                {room.unreadCount > 0 ? (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-vote-red px-1.5 text-[10px] font-black text-white">
                    {room.unreadCount}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-vote-ink"
                aria-label="채팅방 메뉴"
                onClick={() => setMenuRoomId((current) => (current === room.id ? "" : room.id))}
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {menuOpen ? (
                <div className="absolute right-2 top-12 z-20 w-36 rounded-2xl border border-slate-100 bg-white p-1 shadow-soft">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-black text-vote-red hover:bg-vote-red/10"
                    disabled={deletingRoomId === room.id}
                    onClick={() => {
                      setMenuRoomId("");
                      onDeleteRoom(room.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingRoomId === room.id ? "삭제 중..." : "채팅방 삭제"}
                  </button>
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function NewChatView({
  politicians,
  rooms,
  query,
  setQuery,
  openingPoliticianId,
  onOpenRoom
}: {
  politicians: Politician[];
  rooms: ChatRoom[];
  query: string;
  setQuery: (value: string) => void;
  openingPoliticianId: string;
  onOpenRoom: (politician: Politician) => void;
}) {
  return (
    <div className="ios-scroll flex-1 overflow-y-auto px-5 py-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 정당 검색" className="rounded-full bg-slate-50 pl-10" />
      </div>

      <div className="mt-4 space-y-2">
        {politicians.length === 0 ? <EmptyState title="정치인 계정이 없습니다" description="관리자가 등록한 정치인 계정만 DM 목록에 표시됩니다." /> : null}
        {politicians.map((politician, index) => {
          const existingRoom = rooms.find((room) => room.politicianId === politician.id);
          return (
            <motion.div
              key={politician.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.025, 0.16) }}
              className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-soft"
            >
              <PoliticianAvatar politician={politician} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-black text-vote-ink">{politician.name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{politician.party}</span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{politician.role} · {politician.region}</p>
                <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-400">
                  {politician.tags.length ? politician.tags.slice(0, 3).join(" · ") : "성향 미입력"}
                </p>
              </div>
              <Button size="sm" variant={existingRoom ? "outline" : "primary"} onClick={() => onOpenRoom(politician)} disabled={openingPoliticianId === politician.id}>
                {openingPoliticianId === politician.id ? "열기..." : existingRoom ? "열기" : "DM"}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ChatRoomView({
  activeRoomId,
  activeRoom,
  activePolitician,
  messages,
  userId,
  draft,
  setDraft,
  submit,
  messageLoading,
  onBack,
  bottomRef
}: {
  activeRoomId: string;
  activeRoom?: ChatRoom;
  activePolitician?: Politician;
  messages: ChatMessage[];
  userId: string;
  draft: string;
  setDraft: (value: string) => void;
  submit: () => void;
  messageLoading: boolean;
  onBack: () => void;
  bottomRef: RefObject<HTMLDivElement | null>;
}) {
  if (!activeRoom || !activePolitician) {
    return (
      <div className="px-5 py-5">
        <ErrorState title="채팅방을 찾지 못했습니다" description="채팅 목록에서 다시 선택해 주세요." onRetry={onBack} />
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#f4f7fb]">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white/90 px-5 pb-3 pt-[calc(14px+env(safe-area-inset-top))] backdrop-blur-2xl">
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100" aria-label="채팅 목록으로 돌아가기">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PoliticianAvatar politician={activePolitician} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-vote-ink">{activePolitician.name}</p>
          <p className="text-xs font-semibold text-slate-500">{activePolitician.party}</p>
        </div>
      </div>

      <div className="ios-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messageLoading ? <ShimmerLoader text="메시지를 불러오는 중..." /> : null}
        {!messageLoading && messages.length === 0 ? (
          <div className="flex min-h-[44vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-vote-blue">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-black text-vote-ink">첫 메시지를 보내보세요</p>
              <p className="mt-1 text-xs font-medium text-slate-400">대화는 이곳에 실시간으로 쌓입니다.</p>
            </div>
          </div>
        ) : null}
        {messages.map((message, index) => {
          const mine = message.senderId === userId;
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(index * 0.02, 0.16) }}
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

      <div className="border-t border-slate-100 bg-white px-5 pb-[calc(92px+env(safe-area-inset-bottom))] pt-3">
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
    </section>
  );
}

function PoliticianAvatar({ politician, size }: { politician?: Politician; size: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-2xl bg-slate-100" style={{ width: size, height: size }}>
      {politician?.avatarUrl ? <Image src={politician.avatarUrl} alt={politician.name} fill sizes={`${size}px`} className="object-cover" /> : null}
    </div>
  );
}
