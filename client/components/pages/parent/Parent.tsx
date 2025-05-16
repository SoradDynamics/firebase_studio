// Parent.tsx
import { useMediaQuery } from "react-responsive";

import Parent_Mobile from "./Mobile";
import Layout from "./Layout"; // Import Layout directly
import { NotificationProvider } from "../common/NotificationContext";
import { ParentProvider } from "./contexts/ParentContext";
import { StudentProvider } from "../student/components/StudentContext";
import { SelectedStudentProvider } from "./contexts/SelectedStudentContext";

const Parent = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    <>
<SelectedStudentProvider>
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
      </SelectedStudentProvider>
    
     </>
  );
};

export default Parent;