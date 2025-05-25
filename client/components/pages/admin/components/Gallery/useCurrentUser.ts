import { useState, useEffect } from 'react';
import { account } from '~/utils/appwrite';
import { Models } from 'appwrite';

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const user = await account.get();
        setCurrentUser(user);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch user');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  return { currentUser, userId: currentUser?.$id, loadingUser: loading, userError: error };
}