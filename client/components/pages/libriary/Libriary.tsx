// src/Libriary.tsx
import { useMediaQuery } from "react-responsive";
import Student_Mobile from "./Mobile"; // Adjust path if needed
import Layout from "./Layout"; // Adjust path if needed
import React from "react"; // Ensure React is imported
import { LibrarianDataProvider } from "./components/LibrarianContext";
const Libriary = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    <LibrarianDataProvider>
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
        </LibrarianDataProvider>
  );
};

export default Libriary;