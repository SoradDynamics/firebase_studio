//utils/appwriteAuth.ts

//for auth 

import { account } from '~/utils/appwrite'; // Ensure this path is correct
import { Models } from 'appwrite';

console.log('[appwriteAuth.ts] File is being evaluated.'); // Top-level log

export const getCurrentUser = async (): Promise<Models.User<Models.Preferences> | null> => {
  console.log('[appwriteAuth.ts] getCurrentUser function IS CALLED.'); // Log inside function
  try {
    const user = await account.get();
    console.log('[appwriteAuth.ts] Appwrite account.get() successful:', user);
    return user;
  } catch (error) {
    console.error('[appwriteAuth.ts] Error in getCurrentUser:', error);
    return null;
  }
};

console.log('[appwriteAuth.ts] getCurrentUser has been defined:', typeof getCurrentUser); // Log after definition