import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { supabase } from '../../auth/supabase.js';

type Room = { id: string; kind: string; district?: string; member_count: number; last_message?: string | null };
type Message = { id?: string; user_id?: string; senderId?: string; body: string; created_at?: string };

/** WS base: same origin (dev proxy) — server mounts /ws. */
function wsBase() {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

export default function RoomsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/v1/rooms', { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms ?? []))
      .catch(() => setRooms([]));
  }, [token]);

  if (roomId) return <RoomView roomId={roomId} onBack={() => setRoomId(null)} />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Rooms</h1>
      {rooms.length === 0 && <p className="text-sm opacity-70">No rooms yet — join a city room or a spot in the app.</p>}
      <ul className="divide-y divide-neutral-200">
        {rooms.map((r) => (
          <li key={r.id}>
            <button className="w-full text-left py-3 hover:bg-neutral-50" onClick={() => setRoomId(r.id)}>
              <div className="flex justify-between">
                <span className="font-medium">{r.district ?? `${r.kind} room`}</span>
                <span className="text-xs opacity-60">{r.member_count} members</span>
              </div>
              {r.last_message && <div className="text-sm opacity-70 truncate">{r.last_message}</div>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoomView({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/v1/rooms/${roomId}/messages`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {});
    const socket = io(wsBase(), { path: '/ws', auth: { token }, reconnectionDelay: 2000 });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('room:join', roomId); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:new', (m: Message & { roomId: string }) => {
      if (m.roomId === roomId) setMessages((prev) => [...prev, m]);
    });
    return () => { socket.disconnect(); };
  }, [roomId, token]);

  const send = () => {
    const body = draft.trim();
    if (!body || !socketRef.current) return;
    setDraft('');
    socketRef.current.emit('message:send', { roomId, body }, (ack: { ok: boolean; error?: string }) => {
      if (!ack?.ok && ack?.error === 'phone_not_verified') {
        setMessages((prev) => [...prev, { body: '⚠️ Verify your phone in the app to post.', user_id: 'system' }]);
      }
    });
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="flex items-center gap-3 mb-2">
        <button className="text-sm underline" onClick={onBack}>← Rooms</button>
        <span className="text-xs opacity-60">{connected ? 'live' : 'connecting…'}</span>
      </div>
      <div className="flex-1 overflow-y-auto border rounded-lg p-3 space-y-2 mb-2">
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={`text-sm ${m.user_id === 'system' ? 'italic opacity-60' : ''}`}>{m.body}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message…"
        />
        <button className="bg-neutral-900 text-white px-4 rounded text-sm" onClick={send}>Send</button>
      </div>
    </div>
  );
}
