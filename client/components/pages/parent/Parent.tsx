// Parent.tsx
import { useMediaQuery } from "react-responsive";

import Parent_Mobile from "./Mobile";
import Layout from "./Layout"; // Import Layout directly

const Parent = () => {
  const isDesk = useMediaQuery({ minWidth: 767 });

  return (
    <>
      {isDesk ? (
        <div>
          <Layout /> {/* Use Layout directly */}
        </div>
      ) : (
        <div>
          <Parent_Mobile />
        </div>
      )}
    </>
  );
};

export default Parent;