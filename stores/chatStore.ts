"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sampleChatRooms, sampleMessages } from "@/services/data/mockData";
import type { ChatMessage, ChatRoom } from "@/types";

interface ChatState {
  rooms: ChatRoom[];
  messagesByRoom: Record<string, ChatMessage[]>;
  activeRoomId: string;
  setActiveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, senderId: string, body: string) => void;
  markRead: (roomId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      rooms: sampleChatRooms,
      messagesByRoom: sampleMessages,
      activeRoomId: sampleChatRooms[0]?.id ?? "",
      setActiveRoom(roomId) {
        set({ activeRoomId: roomId });
        get().markRead(roomId);
      },
      sendMessage(roomId, senderId, body) {
        if (!body.trim()) return;
        const message: ChatMessage = {
          id: `message-${crypto.randomUUID()}`,
          roomId,
          senderId,
          body: body.trim(),
          createdAt: new Date().toISOString(),
          read: senderId !== "demo-user"
        };

        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: [...(state.messagesByRoom[roomId] ?? []), message]
          },
          rooms: state.rooms
            .map((room) =>
              room.id === roomId
                ? {
                    ...room,
                    lastMessage: message.body,
                    lastMessageAt: message.createdAt,
                    unreadCount: senderId === "demo-user" ? room.unreadCount : room.unreadCount + 1
                  }
                : room
            )
            .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        }));
      },
      markRead(roomId) {
        set((state) => ({
          rooms: state.rooms.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)),
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: (state.messagesByRoom[roomId] ?? []).map((message) => ({ ...message, read: true }))
          }
        }));
      }
    }),
    {
      name: "voteit-chat"
    }
  )
);
