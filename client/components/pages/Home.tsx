import { toast, Toaster } from "react-hot-toast";
import { account } from "~/utils/appwrite";
import { useNavigate } from "@remix-run/react";
import { useMediaQuery } from "react-responsive";
import Admin from "./admin/Admin";
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
      {user.isParent && <div></div>}

      {/* 🔹 Show this div only for Student users */}
      {user.isStudent && <div></div>}

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
