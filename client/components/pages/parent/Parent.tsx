// Parent.tsx
import { useMediaQuery } from "react-responsive";

import Parent_Mobile from "./Mobile";
import Layout from "./Layout"; // Import Layout directly
import { NotificationProvider } from "./context/NotificationContext";
// import { ParentNotification } from "./components/Notification";

const Parent = () => {
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
          {/* <Parent_Mobile /> */}
        </div>
      )}
    </>
  );
};

export default Parent;