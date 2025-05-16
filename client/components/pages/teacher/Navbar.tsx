// ~/teacher/components/TeacherNavbar.tsx

import React, { useEffect, useState } from "react";
import { Bars3Icon, BellIcon } from "@heroicons/react/24/outline";
import { IoMdLogOut } from "react-icons/io";
import { useNavigate } from "@remix-run/react"; // Or your router's navigate function
import { toast } from "react-hot-toast";
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownSection,
    DropdownItem,
    Avatar,
    Button,
} from "@heroui/react"; // Assuming this is the correct import path for HeroUI

// Appwrite Import
import { account } from "~/utils/appwrite"; // Adjust path as needed

// --- CONTEXT IMPORTS ---
import { TeacherContextType, useTeacherData } from "./components/TeacherContext"; // Path to your TeacherContext
import { useNotificationContext } from "../common/NotificationContext"; // Adjust path as needed

// Component Imports
import SearchBar from "./SearchBar"; // Adjust path to your generic SearchBar
import TeacherNotificationPage from "./components/TeacherNotificationPage"; // Path to your TeacherNotificationPage

interface TeacherNavbarProps {
    toggleSidebar: () => void;
    setActiveItem: (item: string) => void; // If search bar navigates within teacher section
}

const TeacherNavbar: React.FC<TeacherNavbarProps> = ({ toggleSidebar, setActiveItem }) => {
    const [email, setEmail] = useState<string | null>(null);
    const navigate = useNavigate();

    // --- Get data from contexts ---
    const { teacherData, loading: teacherLoading, error: teacherError }: TeacherContextType = useTeacherData();
    const { notifications, loading: notificationsLoading, currentUserType } = useNotificationContext();

    // Filter notifications for the current user if they are a teacher
    // NotificationContext already provides filtered notifications based on currentUser
    const notificationCount = (currentUserType === 'teacher' && !notificationsLoading) ? notifications.length : 0;

    // --- Event Handlers ---
    const handleLogout = async () => {
        try {
            await account.deleteSession("current");
            toast.success("Logged out successfully!");
            // Depending on your setup, you might navigate or reload
            // navigate("/login"); // Example navigation
            window.location.reload();
        } catch (error: any) {
            console.error("Logout failed:", error);
            toast.error(error.message || "Logout failed!");
        }
    };

    // --- Fetch User Email ---
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
                console.error("TeacherNavbar: Failed to get user email:", err);
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

            {/* Search Bar */}
            <div className="flex-grow min-w-0 px-2">
                <SearchBar setActiveItem={setActiveItem} /> {/* Ensure SearchBar is generic or adapted */}
            </div>

            {/* Right Side Icons & User Menu */}
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">

                {/* Notification Bell Dropdown */}
                <Dropdown placement="bottom-end" backdrop="opaque">
                    <DropdownTrigger>
                        <Button
                            isIconOnly variant="light"
                            className="relative text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 rounded-full dark:text-gray-400 dark:hover:text-gray-100"
                            aria-label="Notifications" >
                            <BellIcon className="w-6 h-6" />
                            {currentUserType === 'teacher' && !notificationsLoading && notificationCount > 0 && (
                                <span className="absolute top-[5px] right-[5px] flex items-center justify-center h-[1.08rem] w-4.5 min-w-[1rem] rounded-full font-medium bg-red-500 text-white text-[13px] leading-none px-1 ring-2 ring-white dark:ring-gray-800 animate-bounce"
                                    title={`${notificationCount} new notifications`} >
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Notification menu" className="p-0 max-w-sm w-screen sm:w-auto dark:bg-gray-800">
                        <DropdownItem key="notification-center" isReadOnly className="p-0 focus:bg-transparent focus:outline-none cursor-default">
                            {/* Use TeacherNotificationPage here */}
                            {currentUserType === 'teacher' ? <TeacherNotificationPage /> : <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Notifications unavailable.</div>}
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>

                {/* User Profile Dropdown */}
                <Dropdown placement="bottom-end" backdrop="opaque">
                    <DropdownTrigger>
                        <Avatar as="button" showFallback
                            name={teacherLoading ? undefined : (teacherData?.name || "")} // Use teacherData
                            classNames={{ base: "bg-gradient-to-br from-green-500 to-teal-600 transition-transform ring-2 ring-offset-1 ring-transparent group-hover:ring-teal-300 dark:ring-offset-gray-800", name: "text-xs font-semibold text-white", }} // Adjusted color for teachers
                            className="cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 rounded-full"
                            aria-label="User menu" />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="User actions" variant="faded" className="dark:bg-gray-800">
                        <DropdownSection showDivider>
                            <DropdownItem key="profile" isReadOnly className="h-14 gap-2 opacity-90 cursor-default dark:text-gray-400">
                                <p className="font-semibold text-gray-800 truncate dark:text-gray-200">
                                    {teacherLoading ? "Loading..." : (teacherData?.name || "Teacher User")}
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

export default TeacherNavbar;