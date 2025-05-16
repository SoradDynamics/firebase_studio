// Teacher.tsx
import { useMediaQuery } from "react-responsive";

import Teacher_Mobile from "./Mobile";
import Layout from "./Layout";
import { NotificationProvider } from "../common/NotificationContext";
import { TeacherProvider } from "./components/TeacherContext";
import { StudentProvider } from "../student/components/StudentContext";
import { ParentProvider } from "../parent/contexts/ParentContext";

const Teacher = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
          <StudentProvider>
    <ParentProvider>
      <TeacherProvider>
    <NotificationProvider>
        {/* <ParentProvider> */}
            {isDesk ? (
              <div>
                <Layout />
              </div>
            ) : (
              <div>
                <Teacher_Mobile />
              </div>
            )}
    </NotificationProvider>
      </TeacherProvider>
        </ParentProvider>
          </StudentProvider>
  );
};

export default Teacher;
