// app/components/Navbar.tsx

import React from "react"; // Ensure React is imported
import { Bars3Icon, BellIcon } from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar"; // Assuming SearchBar is in the same directory or adjust path
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  Avatar,
  AvatarIcon,
  Button,
  Select,
  SelectItem
} from "@heroui/react"; // Using HeroUI React components
import { IoMdLogOut } from "react-icons/io";
import { useNavigate } from "@remix-run/react";
import { toast } from "react-hot-toast";
import { account } from "~/utils/appwrite"; // Appwrite utility
import { useStudentData } from "./StudentContext"; // Student data context hook
import { useNotifications } from "./context/NotificationContext"; // Notification context hook (adjust path if needed)
// import { NotificationCenter } from "./NotificationCenter"; // Notification display component (adjust path if needed)
import ParentNotification from "./components/ParentNotification";

interface NavbarProps {
  toggleSidebar: () => void;
  setActiveItem: (item: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar, setActiveItem }) => {
  const navigate = useNavigate();
  const { studentOptions, selectedStudentId, handleStudentChange } = useStudentData();
  const { unreadCount, markAllAsRead } = useNotifications(); // Get unread count and mark function

  // --- Event Handlers ---

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      toast.success("Logged out successfully!");
      window.location.reload(); // Reload the page to clear session
    } catch (error: any) {
      toast.error(error.message || "Logout failed!");
    }
  };

  // Handler for Notification Dropdown Open/Close
  const handleNotificationOpenChange = (isOpen: boolean) => {
    // If the dropdown is opening AND there are unread notifications
    if (isOpen && unreadCount > 0) {
      console.log("Notification dropdown opened, marking all as read.");
      markAllAsRead(); // Call the function from context
    }
  };

  // --- Render Logic ---

  return (
    <nav className="flex flex-row m-3 gap-4 sm:gap-6 items-center justify-between pr-2 rounded   p-2"> {/* Added some basic nav styling */}
      {/* Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        className="p-2 text-gray-700 hover:text-gray-900 font-semibold bg-gray-100 hover:bg-gray-200 rounded-md active:scale-95 transition-colors duration-150 ease-in-out"
        aria-label="Toggle sidebar"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Search Bar - Flexible width */}
      <div className="flex-grow min-w-0 px-2"> {/* Allow shrinking and add padding */}
        <SearchBar setActiveItem={setActiveItem} />
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0"> {/* Prevent shrinking */}

        {/* --- Notification Bell Dropdown --- */}
        <Dropdown
            placement="bottom-end"
            backdrop="opaque"
            onOpenChange={handleNotificationOpenChange} // Call handler on open/close
        >
          <DropdownTrigger>
             {/* Button for accessibility and styling */}
            <Button isIconOnly variant="light" className="relative text-gray-600 hover:text-gray-900" aria-label={`Notifications (${unreadCount} unread)`}>
              <BellIcon className="w-6 h-6" />
              {/* Unread Count Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] leading-tight text-center ring-2 ring-white animate-pulse"> {/* Added pulse animation */}
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownTrigger>
           <DropdownMenu aria-label="Notification menu" className="p-0 max-w-sm">
             <DropdownItem key="notification-center" isReadOnly className="p-0 focus:bg-transparent focus:outline-none cursor-default">
                <ParentNotification />
             </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        {/* --- User Profile Dropdown --- */}
        <Dropdown placement="bottom-end" backdrop="opaque">
          <DropdownTrigger>
            <Avatar
              as="button" // Use button for semantics
              classNames={{
                base: "bg-gradient-to-br from-blue-400 to-indigo-500 transition-transform ring-2 ring-offset-1 ring-transparent group-hover:ring-indigo-300", // Example styling
                icon: "text-white/90",
              }}
              className="cursor-pointer hover:scale-105 group" // Added group for potential hover effects
              icon={<AvatarIcon />}
              aria-label="User menu"
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="User actions" variant="faded">
            {/* Profile Info Section */}
            <DropdownSection showDivider>
              <DropdownItem key="profile" isReadOnly className="h-14 gap-2 opacity-90 cursor-default">
                <p className="font-medium text-gray-800">User Name</p> {/* TODO: Replace with actual user name */}
                <p className="font-normal text-gray-500 text-xs">user.email@example.com</p> {/* TODO: Replace with actual user email */}
              </DropdownItem>
            </DropdownSection>

            {/* Student Selector Section (Conditional) */}
            {studentOptions && ( // Render section only if studentOptions might exist
                <DropdownSection title="Select Student">
                  <DropdownItem key="student-select" isReadOnly className="cursor-default px-2">
                    <Select
                      isDisabled={!studentOptions || studentOptions.length === 0} // Disable if no options
                      className="w-full" // Use full width of item
                      variant="bordered"
                      size="sm"
                      items={studentOptions || []} // Pass empty array if null/undefined
                      aria-label="Select student"
                      placeholder={studentOptions && studentOptions.length > 0 ? "Select a student..." : "No students"}
                      selectedKeys={selectedStudentId ? [selectedStudentId] : []} // Controlled selection
                      onSelectionChange={(keys) => {
                        // keys is a Set in HeroUI v2
                        const selectedKey = Array.from(keys as Set<React.Key>)[0];
                        if(selectedKey !== undefined) {
                            handleStudentChange(selectedKey as string);
                        }
                      }}
                    >
                      {(student) => (
                        // Ensure student object has 'id' and 'name' properties
                        <SelectItem key={student.id}>{student.name}</SelectItem>
                      )}
                    </Select>
                </DropdownItem>
              </DropdownSection>
            )}

            {/* Actions Section */}
            <DropdownSection title="Actions">
              <DropdownItem
                key="logout"
                className="text-danger"
                color="danger"
                startContent={<IoMdLogOut className="w-5 h-5 mr-1"/>} // Added margin
                onPress={handleLogout}
              >
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
