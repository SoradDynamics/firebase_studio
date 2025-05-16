// ~/teacher/Navbar.tsx
import React, { useEffect, useState } from "react";
import { Bars3Icon, BellIcon } from "@heroicons/react/24/outline";
import { IoMdLogOut } from "react-icons/io";
import { useNavigate } from "@remix-run/react";
import { toast } from "react-hot-toast";
import {
    Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem, Avatar, Button,
} from "@heroui/react";

import { account } from "~/utils/appwrite";
import { TeacherContextType, useTeacherData } from "./components/TeacherContext"; // Use TeacherContext
import { useNotificationContext } from "../common/NotificationContext";
import TeacherNotificationPage from "./components/TeacherNotificationPage"; // Use TeacherNotificationPage
// import TeacherSearchBar from "./TeacherSearchBar"; // If needed

interface TeacherNavbarProps {
    toggleSidebar: () => void;
    // setActiveItem?: (item: string) => void;
}

const TeacherNavbar: React.FC<TeacherNavbarProps> = ({ toggleSidebar }) => {
    const [email, setEmail] = useState<string | null>(null);
    const navigate = useNavigate();

    const { teacherData, loading: teacherLoading }: TeacherContextType = useTeacherData();
    const { notifications, loading: notificationsLoading } = useNotificationContext();
    const notificationCount = notifications.length;

    const handleLogout = async () => { /* ... (same as other navbars) ... */
        try {
            await account.deleteSession("current");
            toast.success("Logged out successfully!");
            window.location.reload();
        } catch (error: any) {
            console.error("Logout failed:", error);
            toast.error(error.message || "Logout failed!");
        }
    };

    useEffect(() => { /* ... (same email fetching as other navbars) ... */
        let isMounted = true;
        account.get().then(user => {
            if (isMounted && user) setEmail(user.email);
            else if (isMounted) setEmail(null);
        }).catch(err => {
            if (isMounted) console.error("TeacherNavbar: Failed to get user email:", err);
        });
        return () => { isMounted = false; };
    }, []);

    return (
        <nav className="flex flex-row m-3 gap-4 sm:gap-6 items-center justify-between pr-2 rounded bg-white dark:bg-gray-800">
            <button onClick={toggleSidebar} /* ... */ >
                <Bars3Icon className="w-6 h-6" />
            </button>

            <div className="flex-grow min-w-0 px-2">
                 <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                    Teacher Dashboard
                </span>
                {/* <TeacherSearchBar setActiveItem={setActiveItem} /> // If needed */}
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
                <Dropdown placement="bottom-end" backdrop="opaque">
                    <DropdownTrigger>
                        <Button isIconOnly variant="light" /* ... */ >
                            <BellIcon className="w-6 h-6" />
                            {!notificationsLoading && notificationCount > 0 && (
                                <span /* ... badge ... */ >
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Notification menu" className="p-0 max-w-sm w-screen sm:w-auto dark:bg-gray-800">
                        <DropdownItem key="notification-center" isReadOnly className="p-0 ...">
                            <TeacherNotificationPage />
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>

                <Dropdown placement="bottom-end" backdrop="opaque">
                    <DropdownTrigger>
                        <Avatar as="button" showFallback
                            name={teacherLoading ? undefined : (teacherData?.name || "")}
                            // Optionally change Avatar color for teachers
                            classNames={{ base: "bg-gradient-to-br from-purple-500 to-pink-600 transition-transform ring-2 ...", name: "text-xs ...", }}
                            className="cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-400 ..."
                            aria-label="User menu" />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="User actions" variant="faded" className="dark:bg-gray-800">
                        <DropdownSection showDivider>
                            <DropdownItem key="profile" isReadOnly className="h-14 ...">
                                <p className="font-semibold ...">
                                    {teacherLoading ? "Loading..." : (teacherData?.name || "Teacher User")}
                                </p>
                                <p className="font-normal ...">
                                    {email || "..."}
                                </p>
                            </DropdownItem>
                        </DropdownSection>
                        <DropdownSection title="Actions">
                            <DropdownItem key="logout" className="text-danger ..." color="danger"
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