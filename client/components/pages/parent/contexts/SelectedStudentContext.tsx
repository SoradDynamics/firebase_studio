// parent/contexts/SelectedStudentContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface SelectedStudentContextType {
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
  // You could also add the full student object here if fetched globally
  // selectedStudent: Student | null; 
}

const SelectedStudentContext = createContext<SelectedStudentContextType | undefined>(undefined);

const LAST_SELECTED_STUDENT_ID_KEY = 'lastSelectedStudentId_global'; // Use a distinct key

export const SelectedStudentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedStudentId, setSelectedStudentIdState] = useState<string | null>(() => {
    return localStorage.getItem(LAST_SELECTED_STUDENT_ID_KEY) || null;
  });

  useEffect(() => {
    if (selectedStudentId) {
      localStorage.setItem(LAST_SELECTED_STUDENT_ID_KEY, selectedStudentId);
    } else {
      localStorage.removeItem(LAST_SELECTED_STUDENT_ID_KEY);
    }
  }, [selectedStudentId]);

  const setSelectedStudentId = (id: string | null) => {
    setSelectedStudentIdState(id);
  };

  return (
    <SelectedStudentContext.Provider value={{ selectedStudentId, setSelectedStudentId }}>
      {children}
    </SelectedStudentContext.Provider>
  );
};

export const useSelectedStudent = (): SelectedStudentContextType => {
  const context = useContext(SelectedStudentContext);
  if (context === undefined) {
    throw new Error('useSelectedStudent must be used within a SelectedStudentProvider');
  }
  return context;
};