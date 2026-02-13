import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { User } from '../types';
import { db } from '../services/db';

interface AuthActionDependencies {
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export const useAuthActions = ({
  users,
  setUsers,
  setCurrentUser,
  setLoading,
}: AuthActionDependencies) => {
  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const loggedInUser = await db.login(email.toLowerCase(), password);
        const fullUser = await db.getUser(loggedInUser.id);
        setCurrentUser(fullUser);
      } catch (err: any) {
        console.error('Login Error:', err);
        alert(err.message || 'Login failed. Please check your email and password.');
      } finally {
        setLoading(false);
      }
    },
    [setCurrentUser, setLoading]
  );

  const handleSignUp = useCallback(
    async (userData: Partial<User>, password: string) => {
      if (users.some((u) => u.email.toLowerCase() === userData.email?.toLowerCase())) {
        alert('An account with this email already exists.');
        return;
      }

      try {
        const newUser: User = {
          rating: 0,
          ratingCount: 0,
          id: crypto.randomUUID(),
          email: userData.email,
          name: userData.name,
          role: userData.role,
          avatar: userData.avatar,
          firstName: userData.name.split(' ')[0] || '',
          surname: userData.surname.split(' ')[0] || '',
          experienceAnswers: [],
        };

        const created = await db.register(newUser, password);
        setUsers((prev) => [...prev, created]);
        setCurrentUser(created);
      } catch (error: any) {
        alert(error.message || 'Failed to create account');
        throw error;
      }
    },
    [setCurrentUser, setUsers, users]
  );

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  const handleUpdateProfile = useCallback(
    async (updatedUser: User) => {
      const saved = await db.saveUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
      setCurrentUser(saved);
    },
    [setCurrentUser, setUsers]
  );

  return { handleLogin, handleSignUp, handleLogout, handleUpdateProfile };
};
