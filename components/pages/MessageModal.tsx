import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../services/db';
import type { Job, Message, User } from '../../types';

type MessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  currentUser: User;
  otherUser: User | null;
};

const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  job,
  currentUser,
  otherUser,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [messages]
  );

  useEffect(() => {
    const loadMessages = async () => {
      if (!job) return;
      setLoading(true);
      setError(null);
      try {
        const data = await db.getMessages(job.id, currentUser.id);
        setMessages(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load messages.');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, job, currentUser.id]);

  const handleSend = async () => {
    if (!job || !otherUser) return;
    const content = newMessage.trim();
    if (!content) return;
    try {
      const created = await db.createMessage({
        jobId: job.id,
        senderId: currentUser.id,
        receiverId: otherUser.id,
        content,
      });
      setMessages((prev) => [...prev, created]);
      setNewMessage('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <p className="text-sm text-gray-500">
              {job.title} • {otherUser?.name ?? 'Participant'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
          {loading && <p className="text-sm text-gray-500">Loading messages...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !sortedMessages.length && (
            <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
          )}
          {sortedMessages.map((msg) => {
            const isMine = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                    isMine ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`mt-1 text-xs ${isMine ? 'text-teal-100' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || !otherUser}
              className="px-4 py-2 text-sm font-semibold rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
