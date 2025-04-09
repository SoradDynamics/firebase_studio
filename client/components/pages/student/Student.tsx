// Student.tsx
import { useMediaQuery } from "react-responsive";

import Student_Mobile from "./Mobile";
import Layout from "./Layout"; // Import Layout directly
import { NotificationProvider } from "./context/NotificationContext";
// import { StudentNotification } from "./components/Notification";

const Student = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    <>
      {isDesk ? (
        <div>
          <NotificationProvider>

          <Layout /> {/* Use Layout directly */}
          </NotificationProvider>
        </div>
      ) : (
        <div>
          <Student_Mobile />
        </div>
      )}
    </>
  );
};

export default Student;