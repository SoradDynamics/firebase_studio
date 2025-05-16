// ~/parent/Navbar.tsx (or a similar path like app/routes/parent/components/Navbar.tsx)
import React, { useEffect, useState } from "react";
import { Bars3Icon, BellIcon } from "@heroicons/react/24/outline";
import { IoMdLogOut } from "react-icons/io";
import { useNavigate } from "@remix-run/react"; // Assuming you're using Remix
import { toast } from "react-hot-toast";
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownSection,
    DropdownItem,
    Avatar,
    Button,
} from "@heroui/react"; // Adjust import if necessary

// Appwrite
import { account } from "~/utils/appwrite"; // Adjust path if needed

// --- PARENT CONTEXT IMPORTS ---
import { ParentContextType, useParentData } from "./components/ParentContext"; // Adjust path to your ParentContext

// --- COMMON NOTIFICATION CONTEXT IMPORT ---
import { useNotificationContext } from "../common/NotificationContext"; // Adjust path

// --- COMPONENT IMPORTS ---
// Parent SearchBar - You might need a different or no search bar for parents
// import ParentSearchBar from "./ParentSearchBar"; // Create if needed
import ParentNotificationPage from "./components/Notification/NotificationPage"; // Import the parent-specific notification page
import SearchBar from "./SearchBar";

interface ParentNavbarProps {
    toggleSidebar: () => void; // Keep if parents have a similar sidebar
    setActiveItem?: (item: string) => void;
}

const ParentNavbar: React.FC<ParentNavbarProps> = ({
    toggleSidebar,
    setActiveItem = () => {},
}) => {
    const [email, setEmail] = useState<string | null>(null);
    const navigate = useNavigate();

    // --- Get data from PARENT context ---
    const { parentData, loading: parentLoading, error: parentError }: ParentContextType = useParentData();

    // --- Get data from Notification context ---
    const { notifications, loading: notificationsLoading } = useNotificationContext();
    const notificationCount = notifications.length;


    // --- Event Handlers ---
    const handleLogout = async () => {
        try {
            await account.deleteSession("current");
            toast.success("Logged out successfully!");
            window.location.reload(); // Or navigate to login page
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
                console.error("ParentNavbar: Failed to get user email:", err);
                setEmail(null);
            }
        });
        return () => { isMounted = false; };
    }, []);

    // --- Render Logic ---
    return (
        <nav className="flex flex-row m-3 gap-4 sm:gap-6 items-center justify-between pr-2 rounded bg-white dark:bg-gray-800">
            {/* Sidebar Toggle Button - Keep if parents have one */}
            <button
                onClick={toggleSidebar}
                className="p-2 text-gray-700 hover:text-gray-900 font-semibold bg-gray-100 hover:bg-gray-200 rounded-md active:scale-95 transition-colors duration-150 ease-in-out dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                aria-label="Toggle sidebar"
            >
                <Bars3Icon className="w-6 h-6" />
            </button>

             {/* Search Bar */}
             <div className="flex-grow min-w-0 px-2">
                <SearchBar setActiveItem={setActiveItem} />
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
                            {!notificationsLoading && notificationCount > 0 && (
                                <span className="absolute top-[5px] right-[5px] flex items-center justify-center h-[1.08rem] w-4.5 min-w-[1rem] rounded-full font-medium bg-red-500 text-white text-[13px] leading-none px-1 ring-2 ring-white dark:ring-gray-800 animate-bounce"
                                    title={`${notificationCount} new notifications`} >
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Notification menu" className="p-0 max-w-sm w-screen sm:w-auto dark:bg-gray-800">
                        <DropdownItem key="notification-center" isReadOnly className="p-0 focus:bg-transparent focus:outline-none cursor-default">
                            <ParentNotificationPage /> {/* Use ParentNotificationPage */}
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>

                {/* User Profile Dropdown */}
                <Dropdown placement="bottom-end" backdrop="opaque">
                    <DropdownTrigger>
                        <Avatar as="button" showFallback
                            // Use parentData for name
                            name={parentLoading ? undefined : (parentData?.name || "")}
                            // Optionally change Avatar color for parents
                            classNames={{ base: "bg-gradient-to-br from-green-500 to-teal-600 transition-transform ring-2 ring-offset-1 ring-transparent group-hover:ring-teal-300 dark:ring-offset-gray-800", name: "text-xs font-semibold text-white", }}
                            className="cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 rounded-full"
                            aria-label="User menu" />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="User actions" variant="faded" className="dark:bg-gray-800">
                        <DropdownSection showDivider>
                            <DropdownItem key="profile" isReadOnly className="h-14 gap-2 opacity-90 cursor-default dark:text-gray-400">
                                <p className="font-semibold text-gray-800 truncate dark:text-gray-200">
                                    {/* Use parentData and parentLoading */}
                                    {parentLoading ? "Loading..." : (parentData?.name || "Parent User")}
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

export default ParentNavbar;
