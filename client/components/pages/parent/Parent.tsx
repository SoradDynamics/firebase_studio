// Parent.tsx
import { useMediaQuery } from "react-responsive";

import Parent_Mobile from "./Mobile";
import Layout from "./Layout"; // Import Layout directly
import { NotificationProvider } from "../common/NotificationContext";
import { ParentProvider } from "./components/ParentContext";
import { StudentProvider } from "../student/components/StudentContext";

const Parent = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    <>

    <ParentProvider>
    <StudentProvider>
     <NotificationProvider>
        
      {isDesk ? (
        <div>
         

          <Layout /> {/* Use Layout directly */}
          
        </div>
      ) : (
        <div>
          <Parent_Mobile />
        </div>
      )}

      </NotificationProvider>
    </StudentProvider>

    </ParentProvider>
     </>
  );
};

export default Parent;