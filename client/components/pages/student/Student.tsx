// src/Student.tsx
import { useMediaQuery } from "react-responsive";
import Student_Mobile from "./Mobile"; // Adjust path if needed
import Layout from "./Layout"; // Adjust path if needed
import { StudentProvider } from "./components/StudentContext"; // Adjust path if needed
import { NotificationProvider } from "../common/NotificationContext"; // Adjust path if needed
import React from "react"; // Ensure React is imported

const Student = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    // 1. StudentProvider MUST be outermost if NotificationProvider depends on it
    <StudentProvider>
      {/* 2. NotificationProvider wraps EVERYTHING that might need notification context */}
      <NotificationProvider>
        <> {/* Use fragment or div if needed */}
          {isDesk ? (
            // Layout component will contain Navbar, which contains NotificationPage
            <Layout />
          ) : (
            // Student_Mobile might also contain a Navbar/Bell icon eventually
            // Wrapping it here ensures context is available if needed
            <Student_Mobile />
          )}
        </>
      </NotificationProvider>
    </StudentProvider>
  );
};

export default Student;