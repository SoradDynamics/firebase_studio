// src/hooks/useCurrentUser.ts
import { useState, useEffect } from 'react';
import { account } from '~/utils/appwrite'; // Assuming this path from your example
import { Models } from 'appwrite';

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const user = await account.get();
        setCurrentUser(user);
      } catch (e) {
        setError(e as Error);
        console.error('Failed to fetch current user:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { currentUser, loading, error, email: currentUser?.email };
}