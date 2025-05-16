// Teacher.tsx
import { useMediaQuery } from "react-responsive";

import Teacher_Mobile from "./Mobile";
import Layout from "./Layout";
import { NotificationProvider } from "../common/NotificationContext";
import { TeacherProvider } from "./components/TeacherContext";

const Teacher = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    <>
    <NotificationProvider>
      <TeacherProvider>
      {isDesk ? (
        <div>
          <Layout />
        </div>
      ) : (
        <div>
          <Teacher_Mobile />
        </div>
      )}
      </TeacherProvider>
    </NotificationProvider>
    </>
  );
};

export default Teacher;
