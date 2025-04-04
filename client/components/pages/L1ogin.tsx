import { Form, useNavigate } from "@remix-run/react";
import { useState } from "react";
import {toast, Toaster } from "react-hot-toast";
import { account } from "~/utils/appwrite";
export default function Login({
    setUser,
  }: {
    setUser: (user: object | null) => void;
  }) {

    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (username: string, password: string) => {
        setIsLoggingIn(true);
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
        }
      };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Toaster position="top-right" />
        <h1 className="text-2xl font-bold">Login</h1>
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
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="p-2 border rounded"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Loading..." : "Login"}
          </button>
        </Form>
      </div>
    );
  }