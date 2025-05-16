import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { account } from "~/utils/appwrite";
import Login from "components/pages/Login";
import Home from "components/pages/Home";
import Loading from "components/common/Loading";
//Main component
export default function Index() {
  const [user, setUser] = useState<null | object>(null);
  const [loading, setLoading] = useState(true);

  // Check if User is Logged In (Only show loading at start)
  useEffect(() => {
    account
      .get()
      .then((user) => {
        // 🔹 Extract user role from labels
        const isParent = user.labels?.includes("parent");
        const isStudent = user.labels?.includes("student");
        const isAdmin = user.labels?.includes("admin");
        const isTeacher = user.labels?.includes("teacher");
        const isDriver = user.labels?.includes("driver");
        const isCam = user.labels?.includes("camera");

        setUser({ ...user, isParent, isStudent, isAdmin, isTeacher, isDriver, isCam }); // Store role in state
      }) // Remove success toast here
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

    // Show loading only on first page load
    if (loading) return <Loading />;

  return user ? (
    <Home user={user} setUser={setUser} />
  ) : (
    <Login setUser={setUser}/>
  );
}