import { toast, Toaster } from "react-hot-toast";
import { account } from "~/utils/appwrite";
import { useNavigate } from "@remix-run/react";
import { useMediaQuery } from "react-responsive";
import Admin from "./admin/Admin";
import Student from "./student/Student";
import Parent from "./parent/Parent";
import DriverComponent from "./driver/DriverLocation";
import FaceDetection from "./Camera";
import Teacher from "./teacher/Teacher";
import Libriary from "./libriary/Libriary";
export default function Home({
  user,
  setUser,
}: {
  setUser: (user: object | null) => void;
  user: any;
}) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      toast.success("Logged out successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Logout failed!");
    }
  };

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />

      {user.isParent && <div><Parent/></div>}
      {user.isLib && <div><Libriary/></div>}

      {user.isStudent && <div><Student/></div>}
      {user.isDriver && <div><DriverComponent/></div>}
      {user.isCam && <div><FaceDetection/></div>}
      {user.isAdmin && 
      <div>
        <Admin/>
        </div>
        }

        {user.isTeacher && <div><Teacher/></div>}

      {/* <button
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          onClick={handleLogout}
        >
          Logout
        </button> */}
    </div>
  );
}
