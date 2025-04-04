// app/components/Sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import {
  HomeIcon, // Example - will be passed as prop
  ChevronDownIcon, // Kept for submenu toggle
} from "@heroicons/react/24/outline";

import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

interface SidebarItem {
  name: string;
  icon: React.ComponentType<React.ComponentProps<any>>; // For Heroicons - or use IconType for react-icons
  // icon: IconType; // If using react-icons
  children?: SidebarItem[];
  component?: React.ComponentType<any>; // Add component property
  activeItem?: string; // prop type of activeItem - not needed here, managed in parent
}

interface SidebarProps {
  sidebarState: number; // Now controlled by parent
  toggleSidebar: () => void; // Function to toggle sidebar from Navbar
  setActiveItem: (item: string) => void;
  activeItem: string;
  sidebarItems: SidebarItem[]; // Prop to receive sidebar menu items
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarState, toggleSidebar, setActiveItem, activeItem, sidebarItems }) => { // Added toggleSidebar prop
  // const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({default: true});

  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>(() => {
    const initialState: { [key: string]: boolean } = {};
    sidebarItems.forEach(item => {
      if (item.children && item.children.length > 0) {
        initialState[item.name] = true; // Set to true for initial open state
      }
    });
    return initialState;
  });

  const [isMobile, setIsMobile] = useState(false);
  const [localActiveItem, setLocalActiveItem] = useState<string | null>(null); // Local state for persistence

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // On component mount, check localStorage for the last active item
    const storedActiveItem = localStorage.getItem('activeSidebarItem');
    if (storedActiveItem) {
      setLocalActiveItem(storedActiveItem);
      setActiveItem(storedActiveItem); // Ensure parent state is also updated on load
    } else if (!activeItem) {
      // If no stored item and no activeItem prop yet, default to "Dashboard"
      setActiveItem("Dashboard");
      setLocalActiveItem("Dashboard");
      localStorage.setItem('activeSidebarItem', "Dashboard");
    }
  }, []);

  useEffect(() => {
    // Update localActiveItem when activeItem prop changes from parent
    if (activeItem && activeItem !== localActiveItem) {
      setLocalActiveItem(activeItem);
    }
  }, [activeItem]);


  useEffect(() => {
    if (localActiveItem) {
      localStorage.setItem('activeSidebarItem', localActiveItem);
    }
  }, [localActiveItem]);


  const handleItemClick = (item: string) => {
    setLocalActiveItem(item);
    setActiveItem(item);
  };

  const toggleSubmenu = (menuName: string) => {
    setOpenSubmenus(prevState => ({
      ...prevState,
      [menuName]: !prevState[menuName],
    }));
  };

  // Helper function to check if localActiveItem is a child of the current item
  const isChildActive = (item: SidebarItem): boolean => {
    if (!item.children || !localActiveItem) {
      return false;
    }
    return item.children.some(child => child.name === localActiveItem);
  };


  const renderMenuItem = (item: SidebarItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isSubmenuOpen = !!openSubmenus[item.name];

    // Highlight parent only if a child is active AND submenu is collapsed
    const isParentActive = isChildActive(item) && !isSubmenuOpen;
    const isSelfActive = localActiveItem === item.name; // For non-submenu items

    // Determine if the current menu item (parent or leaf) should be highlighted
    const isActive = hasChildren ? isParentActive : isSelfActive;


    return (
      <div key={item.name} className="group flex flex-col overflow-visible">
        <div
          className={`flex items-center py-2 pl-2 px-1 gap-1 justify-center cursor-pointer rounded-md ${isActive
            ? "bg-blue-500 text-white"
            : "hover:bg-gray-100"
            }`}
          onClick={() => {
            if (hasChildren) {
              toggleSubmenu(item.name);
            } else {
              handleItemClick(item.name);
            }
          }}
        >
          <item.icon className="w-6 h-6" />
          {sidebarState !== 1 &&  (
            <span className="ml-2 flex-1 text-base font-medium">{item.name}</span>
          )}
          {sidebarState == 1 && !hasChildren && (
            <span className="mr-2 "></span>
          )}
          {hasChildren && ( // Removed sidebarState !== 1 condition here
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${isSubmenuOpen ? "rotate-180" : ""} ${sidebarState === 1 ? 'ml-auto' : 'ml-0'}`} // Adjusted ml-auto for collapsed state
            />
          )}
        </div>
        {hasChildren && item.children && (
          <div
            className={`${isSubmenuOpen ? "block" : "hidden"} space-y-1 mb-1 pl-4 border-t-1 border-gray-400`}
          >
            {item.children.map(childItem => (
              <div
                key={childItem.name}
                className={`flex items-center p-2 mt-1 cursor-pointer rounded-md ${localActiveItem === childItem.name
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-100"
                  }`}
                onClick={() => handleItemClick(childItem.name)}
              >
                <childItem.icon className="w-5 h-5" />
                {sidebarState !== 1 && <span className="ml-2 text-sm">{childItem.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="flex flex-col font-sans m-2">
   
        {/* logo */}
        <div className="flex items-center pt-3 pl-1 rounded-t-xl pb-3 space-x-3 justify-center bg-slate-300/25">
          <img
            src="/ico.png"
            alt="Sorad Dynamics"
            width={32}
            height={32}
            className={`text-gray-800 font-semibold text-xl  ${sidebarState === 1 ? " w-[32] h-[32]"
              : ""
              }`}
          />
          <span className={`${isMobile ? "" : "text-xl"}`}>
            <span
              className={`text-gray-800 font-semibold  ${sidebarState === 1 ? "hidden" : ""}`}
              // className={`text-gray-800 font-semibold  ${sidebarState === 1 ? "hidden" : ""}`}
            >
              Sorad<span className="text-[#f76d37]">Dynamics</span>
            </span>
          </span>
        </div>
        <div
        className={`flex flex-col transition-all duration-300 h-full overflow-auto ease-in-out transform
        ${sidebarState === 0 ? "w-64" : ""} ${sidebarState === 1 ? "w-[4.7rem]" : ""} ${sidebarState === 2 ? "hidden md:w-64 " : ""}
          bg-slate-300/25 md:rounded-b-xl  pb-2  text-gray-800/70  gray-300 slate-500/60
        ${isMobile ? (sidebarState === 0 ? "w-[180px] rounded-none rounded-r-md" : "rounded-none rounded-r-md") : ""}`}
      >
        <PerfectScrollbar>

        {/* Menu Items */}
        <div className="flex-1 space-y-2 mr-3 ml-2 ">
          {sidebarItems.map(renderMenuItem)}
        </div>
        </PerfectScrollbar>
      </div>
    </div>
  );
};

export default Sidebar;