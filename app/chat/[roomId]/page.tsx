import { ChatPage } from "@/features/chat/ChatPage";

export default async function ChatRoomRoute({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <ChatPage initialRoomId={roomId} />;
}
