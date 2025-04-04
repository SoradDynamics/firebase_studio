// admin.tsx
import { useMediaQuery } from "react-responsive";

import Admin_Mobile from "./Mobile";
import Admin_Layout from "./Layout";

const Admin = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    <>
      {isDesk ? (
        <div>
          <Admin_Layout />
        </div>
      ) : (
        <div>
          <Admin_Mobile />
        </div>
      )}
    </>
  );
};

export default Admin;
