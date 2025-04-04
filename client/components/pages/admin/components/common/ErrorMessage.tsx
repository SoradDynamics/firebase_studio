// src/components/ErrorMessage.tsx
import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface ErrorMessageProps {
  message?: string; // Optional message prop, can be undefined or string
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className="bg-red-100 border border-red-400 text-red-700 mb-3 px-4 py-3 rounded relative"
      role="alert"
    >
      <strong className="font-bold">Error! </strong>
      <span className="block sm:inline">{message}</span>
      <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      </span>
    </div>
  );
};

export default ErrorMessage;