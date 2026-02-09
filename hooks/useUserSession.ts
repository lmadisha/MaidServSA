import { useEffect, useState } from 'react';
import { User } from '../types';

const STORAGE_KEY = 'maidserv_user';

const readStoredUser = (): User | null => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
};

export const useUserSession = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => readStoredUser());

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentUser]);

  return { currentUser, setCurrentUser };
};
