import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Notification, User } from '../types';
import { db } from '../services/db';

interface NotificationActionDependencies {
  currentUser: User | null;
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
}

export const useNotificationActions = ({
  currentUser,
  setNotifications,
}: NotificationActionDependencies) => {
  const handleMarkNotificationsRead = useCallback(async () => {
    if (currentUser) {
      await db.markNotificationsRead(currentUser.id);
      setNotifications((prev) =>
        prev.map((n) => (n.userId === currentUser.id ? { ...n, read: true } : n))
      );
    }
  }, [currentUser, setNotifications]);

  const handleNotificationClick = useCallback(
    async (notificationId: string) => {
      try {
        await db.markSingleNotificationRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      } catch (e) {
        console.error('Failed to mark notification as read', e);
      }
    },
    [setNotifications]
  );

  return { handleMarkNotificationsRead, handleNotificationClick };
};
