import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../services/db';
import type { Job, Message, MessageAttachment, User } from '../../types';

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
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');

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
        await db.markMessagesRead(job.id, currentUser.id);
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

  useEffect(() => {
    if (!isOpen || !job) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/ws/messages?jobId=${job.id}&userId=${currentUser.id}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'message.created') {
          const created: Message = message.payload;
          setMessages((prev) => [...prev, created]);
          if (created.receiverId === currentUser.id) {
            await db.markMessagesRead(job.id, currentUser.id);
          }
        }
        if (message.type === 'message.updated') {
          const updated: Message = message.payload;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
        if (message.type === 'message.deleted') {
          const deleted: Message = message.payload;
          setMessages((prev) => prev.map((m) => (m.id === deleted.id ? deleted : m)));
        }
        if (message.type === 'message.read') {
          const { messageIds, readAt } = message.payload ?? {};
          setMessages((prev) =>
            prev.map((m) =>
              messageIds?.includes(m.id) ? { ...m, readAt: readAt ?? m.readAt } : m
            )
          );
        }
        if (message.type === 'typing') {
          const { userId, isTyping } = message.payload ?? {};
          if (userId && userId !== currentUser.id) {
            setIsOtherTyping(!!isTyping);
          }
        }
      } catch (err) {
        console.error('WS message parse error', err);
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [isOpen, job, currentUser.id]);

  const handleSend = async () => {
    if (!job || !otherUser) return;
    const content = newMessage.trim();
    if (!content && attachments.length === 0) return;
    try {
      if (editingMessageId) {
        const updated = await db.updateMessage(editingMessageId, content, currentUser.id);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMessageId(null);
        setNewMessage('');
        return;
      }
      const created = await db.createMessage({
        jobId: job.id,
        senderId: currentUser.id,
        receiverId: otherUser.id,
        content,
        attachments,
      });
      setMessages((prev) => [...prev, created]);
      setNewMessage('');
      setAttachments([]);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const deleted = await db.deleteMessage(messageId, currentUser.id);
      setMessages((prev) => prev.map((m) => (m.id === deleted.id ? deleted : m)));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete message.');
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !job) return;
    setUploading(true);
    setError(null);
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const result = await db.uploadFile(file, currentUser.id, 'messages');
          const attachment: MessageAttachment = {
            type: 'file',
            fileId: result.id,
            url: result.url,
            name: file.name,
            mimeType: file.type,
            size: file.size,
          };
          return attachment;
        })
      );
      setAttachments((prev) => [...prev, ...uploads]);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddLocation = () => {
    const latitude = Number(locationLat);
    const longitude = Number(locationLng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Please enter valid latitude and longitude.');
      return;
    }
    const attachment: MessageAttachment = {
      type: 'location',
      label: locationLabel.trim() || undefined,
      latitude,
      longitude,
    };
    setAttachments((prev) => [...prev, attachment]);
    setLocationLabel('');
    setLocationLat('');
    setLocationLng('');
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    const socket = socketRef.current;
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ type: 'typing', payload: { isTyping: value.length > 0 } }));
    }
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      const socketRef = socketRef.current;
      if (socketRef && socketRef.readyState === socketRef.OPEN) {
        socketRef.send(JSON.stringify({ type: 'typing', payload: { isTyping: false } }));
      }
    }, 1500);
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
                  {msg.deletedAt ? (
                    <p className="italic">Message deleted</p>
                  ) : (
                    <>
                      {msg.content && <p>{msg.content}</p>}
                      {msg.attachments?.length ? (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((attachment, index) => {
                            if (attachment.type === 'file') {
                              return (
                                <a
                                  key={`${msg.id}-file-${index}`}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`block underline ${isMine ? 'text-teal-100' : 'text-teal-700'}`}
                                >
                                  {attachment.name}
                                </a>
                              );
                            }
                            return (
                              <div key={`${msg.id}-loc-${index}`} className="text-xs">
                                📍 {attachment.label || 'Location'} ({attachment.latitude},{' '}
                                {attachment.longitude})
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </>
                  )}
                  <div className={`mt-1 text-xs ${isMine ? 'text-teal-100' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleString()}
                    {msg.editedAt && !msg.deletedAt && <span> • edited</span>}
                    {isMine && msg.readAt && <span> • read</span>}
                  </div>
                  {isMine && !msg.deletedAt && (
                    <div className="mt-2 flex gap-2 text-xs">
                      <button
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setNewMessage(msg.content);
                          setAttachments([]);
                        }}
                        className="underline"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(msg.id)} className="underline">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isOtherTyping && (
            <div className="text-xs text-gray-500">{otherUser?.name ?? 'Someone'} is typing...</div>
          )}
        </div>

        <div className="border-t px-6 py-4">
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {attachments.map((attachment, index) => (
                <span
                  key={`pending-${index}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1"
                >
                  {attachment.type === 'file'
                    ? attachment.name
                    : attachment.label || 'Location'}
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder={editingMessageId ? 'Edit your message...' : 'Type your message...'}
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
            />
            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && attachments.length === 0) || !otherUser}
              className="px-4 py-2 text-sm font-semibold rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              {editingMessageId ? 'Save' : 'Send'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-gray-600">
              Attach files
              <input
                type="file"
                multiple
                className="mt-1 block text-xs"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={uploading || !!editingMessageId}
              />
            </label>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Location label"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="border rounded px-2 py-1"
              />
              <input
                type="text"
                placeholder="Lat"
                value={locationLat}
                onChange={(e) => setLocationLat(e.target.value)}
                className="border rounded px-2 py-1 w-24"
              />
              <input
                type="text"
                placeholder="Lng"
                value={locationLng}
                onChange={(e) => setLocationLng(e.target.value)}
                className="border rounded px-2 py-1 w-24"
              />
              <button
                onClick={handleAddLocation}
                className="text-teal-600 hover:text-teal-800"
                type="button"
              >
                Add location
              </button>
            </div>
          </div>
          {uploading && <p className="mt-2 text-xs text-gray-500">Uploading files...</p>}
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
