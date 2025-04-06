import { toast, Toaster } from "react-hot-toast";
import { account } from "~/utils/appwrite";
import { useNavigate } from "@remix-run/react";
import { useMediaQuery } from "react-responsive";
import Admin from "./admin/Admin";
import Student from "./student/Student";
import Parent from "./parent/Parent";
import {ParentNotification} from "./parent/components/Notification";
import DriverLocation from "./driver/DriverLocation";
import StudentComponent from "./student/StudentComponent1";
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

      {/* 🔹 Show this div only for Parent users */}
      {user.isParent && <div><Parent/></div>}

      {/* 🔹 Show this div only for Student users */}
      {user.isStudent && <div><Student/></div>}
      {user.isDriver && <div><DriverLocation/></div>}

      {/* 🔹 Show this div only for Admin users */}
      {user.isAdmin && 
      <div>
        <Admin/>
        </div>
        }

      {/* <button
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          onClick={handleLogout}
        >
          Logout
        </button> */}
    </div>
  );
}
