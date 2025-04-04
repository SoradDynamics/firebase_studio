// app/components/Navbar.tsx
import { Bars3Icon } from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
  Avatar,
  AvatarIcon,
} from "@heroui/react";
import { IoMdLogOut } from "react-icons/io";
import { useNavigate } from "@remix-run/react";
import { toast, Toaster } from "react-hot-toast";
import { account } from "~/utils/appwrite";
import { Select, SelectItem } from "@heroui/react"; // Import Select
import { useStudentData } from "./StudentContext"; // Import the hook

interface NavbarProps {
  toggleSidebar: () => void;
  setActiveItem: (item: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar, setActiveItem }) => {
  const navigate = useNavigate();
  const { studentOptions, selectedStudentId, handleStudentChange } =
    useStudentData(); // Use the context

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      toast.success("Logged out successfully!");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Logout failed!");
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    handleStudentChange(event.target.value); // Call the context's handler
  };

  return (
    <nav className="flex flex-row m-3 gap-6 items-center justify-between pr-2 rounded">
      <button
        onClick={toggleSidebar}
        className="p-2 text-gray-800 font-semibold bg-[rgb(235,235,235)]/80 rounded-md hover:bg-gray-300/60 active:scale-95 transition-colors duration-200 ease-in-out"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>
      <SearchBar setActiveItem={setActiveItem} />

      <div className="flex items-center">
        <Dropdown placement="bottom-start" backdrop="opaque">
          <DropdownTrigger>
            <Avatar
              classNames={{
                base: "bg-gradient-to-br from-[#FFB457] to-[#FF705B]",
                icon: "text-black/80",
              }}
              className="cursor-pointer"
              icon={<AvatarIcon />}
            />
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Dropdown menu with description"
            variant="faded"
          >
            <DropdownSection showDivider>
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-medium">User name</p>
                <p className="font-semibold text-gray-400"></p>
              </DropdownItem>
            </DropdownSection>

            <DropdownSection>
              <DropdownItem key="logout" className="h-14 gap-2">

              {/* Student Select Dropdown */}
              {studentOptions && studentOptions.length > 0 && (
                <Select
                className="max-w-xs"
                variant="underlined"
                items={studentOptions}
                label="Select Student"
                // placeholder="Select a student"
                onChange={handleChange}
                value={selectedStudentId ?? ""}
                >
                  {(student) => (
                    <SelectItem key={student.id}>{student.name}</SelectItem>
                  )}
                </Select>
              )}
              </DropdownItem>
            </DropdownSection>
            <DropdownSection title={"Actions"}>
              <DropdownItem
                key="logout"
                className="text-danger text-xl"
                color="danger"
                startContent={<IoMdLogOut />}
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
