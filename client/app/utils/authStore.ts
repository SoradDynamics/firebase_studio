// src/utils/authStore.ts
import {create} from 'zustand';
import { account } from '~/utils/appwrite';
import { Models } from 'appwrite';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  label: string;
  isLoading: boolean; // True if actively fetching or in initial unverified state
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  label: 'Guest',
  isLoading: true, // Start as true, indicating we need to verify session
  fetchUser: async () => {
    // Prevent re-fetch if already successfully fetched and not in an initial loading state.
    if (get().user && !get().isLoading) { // `!get().isLoading` here means a previous fetch completed.
        // console.log('[AuthStore] User already fetched.');
        return;
    }
    // If already fetching (e.g. isLoading is true due to an ongoing call), prevent concurrent identical calls.
    // This simple check might not be enough for rapid calls; a dedicated `isFetching` flag would be more robust.
    // However, for an initial call, this is fine. If isLoading is true from initial state, we proceed.

    // If not already in an explicit loading state (e.g. retrying after failure), set it.
    if (!get().isLoading) { // This means isLoading was false (e.g. previous fetch failed)
        set({ isLoading: true });
    }
    
    try {
      const currentUser = await account.get();
      set({
        user: currentUser,
        label: currentUser.labels?.[0] || 'No Label',
        isLoading: false, // Fetch successful
      });
    } catch (error) {
      // console.warn('[AuthStore] No active session or failed to fetch user:', error);
      set({
        user: null,
        label: 'Guest',
        isLoading: false, // Fetch attempt completed (failed)
      });
    }
  },
}));

// OPTIONAL: Trigger initial fetch when the store module is first loaded.
// This helps ensure user state is potentially available sooner globally.
// However, it's often preferred to do this in a top-level React component (e.g., App.tsx's useEffect)
// for better control and to ensure it's within React's lifecycle.
// If uncommented, ensure this doesn't cause issues with server-side rendering if applicable.
// useAuthStore.getState().fetchUser();