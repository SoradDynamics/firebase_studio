// src/utils/authStore.ts
import {create} from 'zustand';
import { account } from '~/utils/appwrite'; // Ensure this path is correct for your Appwrite client
import { Models } from 'appwrite'; // Import Appwrite's Models for User type

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  label: string;
  isLoading: boolean; // True if actively fetching or in initial unverified state
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>; // Added logout functionality
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  label: 'Guest',
  isLoading: true, // Start as true, indicating we need to verify session status
  fetchUser: async () => {
    // If already fetched successfully (user exists and not in initial loading state), return.
    // This simple guard helps prevent redundant API calls if fetchUser is called multiple times rapidly.
    if (get().user && !get().isLoading) {
      // console.log('[AuthStore] User already fetched and not in initial loading state.');
      return;
    }

    // If currently fetching (isLoading is true due to an ongoing fetchUser call), let it complete.
    // This is a very basic check. For more complex scenarios, a dedicated isFetching flag might be better.
    // However, for an initial call or calls spaced out, this works.
    // The main goal is that if isLoading is true from the initial state, we *do* proceed with the fetch.
    
    // If isLoading was false (e.g., previous fetch attempt completed and failed),
    // or if it's the initial load (isLoading is true), set/ensure isLoading is true before the API call.
    if (!get().isLoading || (get().isLoading && !get().user)) { // The second part handles the initial load case
        set({ isLoading: true });
    }
    
    try {
      // console.log('[AuthStore] Attempting to fetch current user from Appwrite...');
      const currentUser = await account.get();
      // console.log('[AuthStore] User fetched successfully:', currentUser.name, currentUser.labels);
      set({
        user: currentUser,
        label: currentUser.labels?.[0] || 'No Label', // Use first label or 'No Label'
        isLoading: false, // Fetch successful, set loading to false
      });
    } catch (error) {
      // console.warn('[AuthStore] No active session or failed to fetch user:', error);
      set({
        user: null,
        label: 'Guest',
        isLoading: false, // Fetch attempt completed (failed), set loading to false
      });
    }
  },
  logout: async () => {
    set({ isLoading: true }); // Indicate activity
    try {
      await account.deleteSession('current'); // Logout from Appwrite
      set({
        user: null,
        label: 'Guest',
        isLoading: false,
      });
      // console.log('[AuthStore] User logged out successfully.');
    } catch (error) {
      console.error('[AuthStore] Error during logout:', error);
      // Even on error, try to reset state, but keep isLoading potentially true if app needs to react
      // Or set to false if the error is handled and user is effectively logged out locally.
      set({
        user: null, // Assume logout even if server error, for local state
        label: 'Guest',
        isLoading: false, // Or handle error state differently
      });
    }
  },
}));

// Optional: Trigger initial fetch when the store module is first loaded.
// This can be useful for SPAs where the user state is needed early.
// However, it's often preferred to do this in a top-level React component (e.g., App.tsx's useEffect)
// for better control within React's lifecycle and to avoid issues if used in SSR.
// If you uncomment this, ensure it doesn't cause race conditions or multiple calls if also called from App.tsx.
// console.log('[AuthStore] Store initialized. Attempting initial user fetch.');
// useAuthStore.getState().fetchUser();