import { useState } from "react";
import { Form } from "@remix-run/react";
import toast, { Toaster } from "react-hot-toast";
import { account, iD } from "~/utils/appwrite";

const SERVER_URL = import.meta.env.VITE_SERVER_URL; // Get Express server URL from .env

// Function to Generate a Random 8-Digit Password
const generatePassword = () => Math.random().toString(36).slice(-8);

// Function to Generate a Unique Username
const generateUsername = (name: string) => {
  const baseName = name.trim().toLowerCase().replace(/\s+/g, "-");
  const randomChars = Math.random().toString(36).slice(-3);
  return `${baseName}-${randomChars}`;
};

// Function to Format Email (****-****-***@skool.edu)
const generateSchoolEmail = (username: string) => {
  return `${username}@skool.edu`;
};

// Function to Update User Label via Express Server
const updateUserLabel = async (userId: string, label: string) => {
  try {
    const response = await fetch(`${SERVER_URL}/update-label`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, label }),
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Label update failed");
    console.log(`User ${userId} Label Updated:`, result);
  } catch (error: any) {
    console.error("Error updating label:", error);
    toast.error(error.message);
  }
};

export default function Signup() {
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Signup Handler
  const handleSignup = async (name: string, email: string) => {
    setIsSigningUp(true);

    const password = generatePassword();
    const username = generateUsername(name);
    const studentEmail = generateSchoolEmail(username);
    const parentId = iD.unique();
    const studentId = iD.unique();

    try {
      // 1️⃣ Create Parent User
      const parentUser = await account.create(parentId, email, password);
      console.log("Parent Created:", parentUser);

      // 2️⃣ Update Parent Label via Express Server
      await updateUserLabel(parentUser.$id, "parent");

      // 3️⃣ Create Student User
      const studentPassword = generatePassword();
      const studentUser = await account.create(
        studentId,
        studentEmail,
        studentPassword
      );
      console.log("Student Created:", studentUser);

      // 4️⃣ Update Student Label via Express Server
      await updateUserLabel(studentUser.$id, "student");

      toast.success("Signup successful! Parent & Student accounts created.");
    } catch (error: any) {
      toast.error(error.message || "Signup failed!");
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold">Signup</h1>
      <Form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          const name = (
            e.currentTarget.elements.namedItem("name") as HTMLInputElement
          ).value;
          const email = (
            e.currentTarget.elements.namedItem("email") as HTMLInputElement
          ).value;
          handleSignup(name, email);
        }}
        className="flex flex-col space-y-4"
      >
        <input
          type="text"
          name="name"
          placeholder="Enter your name"
          className="p-2 border rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Enter your   "
          className="p-2 border rounded"
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded"
          disabled={isSigningUp}
        >
          {isSigningUp ? "Signing up..." : "Signup"}
        </button>
      </Form>
    </div>
  );
}
