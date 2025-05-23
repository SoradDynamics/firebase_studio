// ~/components/Navbar.tsx (or app/components/Navbar.tsx) - For Library Page (No Notifications)

import React, { useEffect, useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline"; // BellIcon removed
import { IoMdLogOut } from "react-icons/io";
import { useNavigate } from "@remix-run/react"; // Keep if using Remix, otherwise use useNavigate from react-router-dom for Vite
import { toast } from "react-hot-toast";
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownSection,
    DropdownItem,
    Avatar,
    // Button, // Button might still be used if you add other icon buttons, but not for BellIcon
} from "@heroui/react"; // Assuming this is the correct import path

// Appwrite and Context Imports
import { account } from "~/utils/appwrite"; // Adjust path if needed

// --- CONTEXT IMPORTS (FOR LIBRARIAN) ---
import { LibrarianContextType, useLibrarianData } from "./components/LibrarianContext"; // ***** ADJUST PATH IF LibrarianContext.tsx IS ELSEWHERE *****

// --- NOTIFICATION CONTEXT AND COMPONENT IMPORTS REMOVED ---
// import { useNotificationContext } from "../common/NotificationContext";
// import NotificationPage from "./NotificationPage";

// Component Imports
import SearchBar from "./SearchBar"; // Adjust path if needed

interface NavbarProps {
    toggleSidebar: () => void;
    setActiveItem: (item: string) => void; // For search or navigation
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar, setActiveItem }) => {
    const [email, setEmail] = useState<string | null>(null);
    const navigate = useNavigate();

    // --- Get data from contexts ---
    const { librarianData, loading: librarianLoading, error: librarianError }: LibrarianContextType = useLibrarianData();

    // --- NOTIFICATION STATE AND COUNT REMOVED ---
    // const { notifications, loading: notificationsLoading } = useNotificationContext();
    // const notificationCount = notifications.length;


    // --- Event Handlers ---
    const handleLogout = async () => {
        try {
            await account.deleteSession("current");
            toast.success("Logged out successfully!");
            window.location.reload();
        } catch (error: any) {
            console.error("Logout failed:", error);
            toast.error(error.message || "Logout failed!");
        }
    };

    // --- Fetch User Email (generic for any Appwrite user) ---
    useEffect(() => {
        let isMounted = true;
        account.get().then(user => {
            if (isMounted && user) {
                setEmail(user.email);
            } else if (isMounted) {
                 setEmail(null);
            }
        }).catch(err => {
            if (isMounted) {
                console.error("Navbar: Failed to get user email:", err);
                setEmail(null);
            }
        });

        return () => { isMounted = false; };
    }, []);

    // --- Render Logic ---
    return (
        <nav className="flex flex-row m-3 gap-4 sm:gap-6 items-center justify-between pr-2 rounded bg-white dark:bg-gray-800">
            {/* Sidebar Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="p-2 text-gray-700 hover:text-gray-900 font-semibold bg-gray-100 hover:bg-gray-200 rounded-md active:scale-95 transition-colors duration-150 ease-in-out dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                aria-label="Toggle sidebar"
            >
                <Bars3Icon className="w-6 h-6" />
            </button>

            {/* Search Bar - Potentially searches books, users, etc. */}
            <div className="flex-grow min-w-0 px-2">
                <SearchBar setActiveItem={setActiveItem} />
            </div>

            {/* Right Side Icons & User Menu */}
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">

                {/* --- NOTIFICATION BELL DROPDOWN REMOVED --- */}

                {/* User Profile Dropdown */}
                <Dropdown placement="bottom-end" backdrop="opaque">
                    <DropdownTrigger>
                        <Avatar as="button" showFallback
                            name={librarianLoading ? undefined : (librarianData?.name || "")}
                            classNames={{ base: "bg-gradient-to-br from-green-500 to-teal-600 transition-transform ring-2 ring-offset-1 ring-transparent group-hover:ring-teal-300 dark:ring-offset-gray-800", name: "text-xs font-semibold text-white", }}
                            className="cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 rounded-full"
                            aria-label="User menu" />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="User actions" variant="faded" className="dark:bg-gray-800">
                        <DropdownSection showDivider>
                            <DropdownItem key="profile" isReadOnly className="h-14 gap-2 opacity-90 cursor-default dark:text-gray-400">
                                <p className="font-semibold text-gray-800 truncate dark:text-gray-200">
                                    {librarianLoading ? "Loading..." : (librarianData?.name || "Librarian User")}
                                </p>
                                <p className="font-normal text-gray-500 text-xs truncate dark:text-gray-400">
                                    {email || "..."}
                                </p>
                            </DropdownItem>
                        </DropdownSection>
                        <DropdownSection title="Actions">
                            <DropdownItem key="logout" className="text-danger dark:text-danger-400" color="danger"
                                startContent={<IoMdLogOut className="w-5 h-5 mr-1" />}
                                onPress={handleLogout} >
                                Logout
                            </DropdownItem>
                        </DropdownSection>
                    </DropdownMenu>
                </Dropdown>

            </div>
        </nav>
    );
};

export default Navbar;