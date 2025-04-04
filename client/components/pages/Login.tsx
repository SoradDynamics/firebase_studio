import React, { useState } from "react";
import { Input } from "@heroui/input";
import { FaFacebook, FaLinkedin, FaUser } from "react-icons/fa";
import { Button, ButtonGroup } from "@heroui/button";
import { EyeFilledIcon, EyeSlashFilledIcon } from "components/icons";
import { IoMdLogIn } from "react-icons/io";
import { GoGlobe } from "react-icons/go";
import { toast, Toaster } from "react-hot-toast";
import { account } from "~/utils/appwrite";
import { Form } from "@remix-run/react";
export default function Login({
  setUser,
}: {
  setUser: (user: object | null) => void;
}) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible(!isVisible);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Add isLoading state

  //validate email
  const validateEmail = (username: string) => username.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i);

  const isInvalid = React.useMemo(() => {
    if (username === "") return false;

    return validateEmail(username) ? false : true;
  }, [username]);

  const handleLogin = async (username: string, password: string) => {
    // e.preventDefault();
    setIsLoggingIn(true);

    setIsLoading(true); // Set loading to true before the request

    try {
      await account.createEmailPasswordSession(username, password);
      const user = await account.get();

      // 🔹 Extract user role from labels
      const isParent = user.labels?.includes("parent");
      const isStudent = user.labels?.includes("student");
      const isAdmin = user.labels?.includes("admin");

      setUser({ ...user, isParent, isStudent, isAdmin }); // Store role in state

      toast.success("Login successful!"); // ✅ Now it only shows when logging in
    } catch (error: any) {
      toast.error(error.message || "Login failed!");
    } finally {
      setIsLoggingIn(false);
      setIsLoading(false); // Set loading to false after the request
    }
  };
  return (
    <div>
            <Toaster position="top-right" />

      <div className="flex min-h-screen justify-center items-center bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
        <div className="container relative bg-white/40 shadow-lg rounded-lg overflow-hidden md:flex md:w-[500px] mx-4 backdrop-blur-lg border border-white/50 max-w-[440px]">
          {/* Left Section */}
          <div className="w-full pt-8 px-3 text-center justify-center flex flex-col">
            <div className="flex items-center mb-5 space-x-3 justify-center">
              <img src="/ico.png" alt="Sorad Dynamics" width={32} height={32} />
              <span className="text-gray-800 font-semibold text-2xl">
                Sorad<span className="text-[#f76d37]">Dynamics</span>
              </span>
            </div>
            <p className="text-xl font-medium mb-8 text-gray-600">
              Login to Sorad Demo School
            </p>

            <Form
              method="post"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const username = (
                  form.elements.namedItem("username") as HTMLInputElement
                ).value;
                const password = (
                  form.elements.namedItem("password") as HTMLInputElement
                ).value;
                handleLogin(username, password);
              }}
              className="flex flex-col space-y-4"
            >
              <div className="flex flex-col items-center justify-center gap-5 px-4">
                <Input
                  className="max-w-xs"
                  name="username"
                  size="md"
                  variant="underlined"
                  type="email"
                  isInvalid={isInvalid}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your user name"
                  endContent={<FaUser className="text-gray-400" />}
                  color="primary"
                  required
                />
                <Input
                  className="max-w-xs"
                  name="password"
                  variant="underlined"
                  placeholder="Enter your password"
                  type={isVisible ? "text" : "password"}
                  endContent={
                    <button
                      aria-label="toggle password visibility"
                      onClick={toggleVisibility}
                      className="focus:outline-none"
                      type="button"
                    >
                      {isVisible ? (
                        <EyeSlashFilledIcon className="text-2xl text-default-400" />
                      ) : (
                        <EyeFilledIcon className="text-2xl text-default-400" />
                      )}
                    </button>
                  }
                  color="primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // handleLogin(e);
                    }
                  }}
                  required
                />

                <Button
                  type="submit"
                  className="text- text-lg px-6 pr-8 mt-3"
                  color="primary"
                  variant="ghost"
                  disabled={isLoggingIn}
                  isLoading={isLoading}
                  startContent={
                    !isLoading && <IoMdLogIn className="text-2xl" />
                  }
                >
                  Login
                </Button>
              </div>
            </Form>

            <div className=" py-5 mb-3 mt-8  relative bg-gradient-to-r from-green-400 to-teal-500 flex items-center justify-center rounded-lg">
              <div className="text-white text-center z-0">
                {/* <p className="mt-4 text-lg">A comprehensive platform designed to simplify school management.</p> */}
                <div className=" text-lg font-medium">Connect with us!</div>
                <div className="flex space-x-2 mt-2 justify-center text-black/60">
                  {[
                    {
                      href: "https://soraddynamics.vercel.app/",
                      icon: <GoGlobe size={24} />,
                    },
                    {
                      href: "https://www.facebook.com/profile.php?id=61569291325991",
                      icon: <FaFacebook size={24} />,
                    },
                    {
                      href: "https://www.linkedin.com/in/sorad-dynamics-a84087346/",
                      icon: <FaLinkedin size={24} />,
                    },
                  ].map((link, idx) => (
                    <div
                      key={idx}
                      className="rounded-full bg-white/55 p-2 w-10 h-10"
                    >
                      <a href={link.href} target="_blank">
                        {link.icon}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
