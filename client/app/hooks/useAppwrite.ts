// src/hooks/useAppwrite.ts
import { useState, useEffect } from 'react';
import { account } from '~/utils/appwrite';  // Import your Appwrite client

const useAppwrite = () => {
  const [appwriteReady, setAppwriteReady] = useState(false);
  const [user, setUser] = useState<null | object>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAppwrite = async () => {
      try {
        // Attempt to get the current account. This also serves as an initialization check.
        const user = await account.get();
          // 🔹 Extract user role from labels
          const isParent = user.labels?.includes("parent");
          const isStudent = user.labels?.includes("student");
          const isAdmin = user.labels?.includes("admin");
          const isDriver = user.labels?.includes("driver");
          const isCam = user.labels?.includes("camera");
          setUser({ ...user, isParent, isStudent, isAdmin, isDriver, isCam });
        setAppwriteReady(true); // Appwrite is initialized
      } catch (error) {
        setUser(null)
        setAppwriteReady(false); // Appwrite failed to initialize
        console.error("Appwrite initialization failed:", error);
        // Optionally, show an error message to the user
      } finally{
        setLoading(false)
      }
    };

    initializeAppwrite();
  }, []);

  return { appwriteReady,user, loading };
};

export default useAppwrite;