import { create } from "zustand";

interface RoutineState {
    routines: any[]; // Replace 'any' with your Routine type
    setRoutines: (routines: any[]) => void;
    addRoutine: (routine: any) => void;
    updateRoutine: (routine: any) => void;
    deleteRoutine: (id: string) => void;
}

export const useRoutineStore = create<RoutineState>((set) => ({
    routines: [],
    setRoutines: (routines) => set({ routines }),
    addRoutine: (routine) => set((state) => ({ routines: [...state.routines, routine] })),
    updateRoutine: (updatedRoutine) =>
        set((state) => ({
            routines: state.routines.map((routine) =>
                routine.id === updatedRoutine.id ? updatedRoutine : routine
            ),
        })),
    deleteRoutine: (id) =>
        set((state) => ({
            routines: state.routines.filter((routine) => routine.id !== id),
        })),
}));