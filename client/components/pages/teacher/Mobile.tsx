{/* Mobile.tsx */}
// app/layout.tsx
import React, { useState, useEffect, useRef } from "react";
import MobileNavMenu from "components/common/MobileNavMenu";
import { Outlet } from "@remix-run/react";
import GeneralComponent from "components/pages/admin/General"; // Import GeneralComponent
import { BellIcon, DashboardIcon, MoonFilledIcon, SearchIcon, SidebarIcon } from "components/icons";
import SearchBar from "./SearchBar-Mob";

const Layout: React.FC = () => {
    const [activeComponent, setActiveComponentState] = useState<string>(() => {
        const storedActive = localStorage.getItem("activeMobileMenu") || "Dashboard";
        return storedActive;
    });
    const [generalMenuItem, setGeneralMenuItem] = useState<string | null>(() => {
        return localStorage.getItem('generalComponentMenuItem') || null;
    }); // State to hold general menu item

    const initialRenderRef = useRef(true);

    useEffect(() => {
        if (initialRenderRef.current) {
            initialRenderRef.current = false;
            const storedActiveComponent = localStorage.getItem("activeMobileMenu");
            const storedGeneralMenuItem = localStorage.getItem("generalComponentMenuItem"); // Retrieve stored general menu item
            if (storedActiveComponent && ["Dashboard", "Search", "Menu", "Notification", "Braimy", "Class", "Subjects", "CenterAction"].includes(storedActiveComponent)) {
                setActiveComponentState(storedActiveComponent);
            } else {
                setActiveComponentState("Dashboard");
            }
            if (storedGeneralMenuItem) { // Set generalMenuItem from localStorage on initial load
                setGeneralMenuItem(storedGeneralMenuItem);
            }
        }
    }, []);


    useEffect(() => {
        localStorage.setItem("activeMobileMenu", activeComponent);
    }, [activeComponent]);

    useEffect(() => {
        localStorage.setItem("generalComponentMenuItem", generalMenuItem || ''); // Store generalMenuItem in localStorage
    }, [generalMenuItem]);


    const setActiveComponent = (componentName: string, generalMenuItemName?: string) => { // Accept generalMenuItemName
        setActiveComponentState(componentName);
        if (componentName === "Menu") {
            if (generalMenuItemName) {
                setGeneralMenuItem(generalMenuItemName); // Set generalMenuItem state from search
            } else if (!generalMenuItemName && localStorage.getItem('generalComponentMenuItem')) {
                // If navigating to "Menu" from MobileNavMenu and no generalMenuItemName is provided,
                // try to restore from localStorage
                setGeneralMenuItem(localStorage.getItem('generalComponentMenuItem'));
            } else {
                setGeneralMenuItem(null); // If navigating to "Menu" and no stored or search item, reset generalMenuItem
            }
        } else {
            setGeneralMenuItem(null); // Reset generalMenuItem if not 'Menu'
        }
    };


    // Define components inline - Added padding and more visual distinction
    const DashboardComponent = () => (
        <div className="p-4 break-words bg-white rounded-md shadow-sm border"> {/* Added padding, background, rounded corners, shadow, border */}
            <h2 className="text-lg font-semibold mb-2">Dashboard</h2> {/* Added title */}
            <p className="text-gray-700">
                Welcome to your dashboard! This is where you can see an overview of your system.
                {/* Example content, adjust as needed */}
            </p>
        </div>
    );

    const AttendanceRootComponent = () => (
        <div className="p-6 bg-white rounded-md shadow-sm border"> {/* Increased padding, background, rounded corners, shadow, border */}
            <h2 className="text-lg font-semibold mb-2">Notifications</h2> {/* Added title */}
            <p className="text-gray-700">
                Check your latest notifications and updates here.
                {/* Example content, adjust as needed */}
            </p>
        </div>
    );
    const ConfigureRootComponent = () => (
        <div className="p-6 bg-white rounded-md shadow-sm border"> {/* Increased padding, background, rounded corners, shadow, border */}
            <h2 className="text-lg font-semibold mb-2">Braimy Settings</h2> {/* Added title */}
            <p className="text-gray-700">
                Configure Braimy related settings.
                {/* Example content, adjust as needed */}
            </p>
        </div>
    );
    const ClassRootComponent = () => (
        <div className="p-6 bg-white rounded-md shadow-sm border"> {/* Increased padding, background, rounded corners, shadow, border */}
            <h2 className="text-lg font-semibold mb-2">Classes</h2> {/* Added title */}
            <p className="text-gray-700">
                Manage your classes and schedules.
                {/* Example content, adjust as needed */}
            </p>
        </div>
    );
    const SubjectsRootComponent = () => (
        <div className="p-6 bg-white rounded-md shadow-sm border"> {/* Increased padding, background, rounded corners, shadow, border */}
            <h2 className="text-lg font-semibold mb-2">Subjects</h2> {/* Added title */}
            <p className="text-gray-700">
                View and manage subjects.
                {/* Example content, adjust as needed */}
            </p>
        </div>
    );

    const menuItems = [
        {
            name: "Dashboard",
            icon: <DashboardIcon className="h-5 w-5" />, // Adjusted icon size for consistency
            onClick: () => setActiveComponent("Dashboard"),
        },
        {
            name: "Search",
            icon: <SearchIcon className="h-5 w-5" />,
            onClick: () => setActiveComponent("Search"),
        },
        {
            name: "Menu",
            icon: <SidebarIcon className="h-5 w-5" />,
            onClick: () => setActiveComponent("Menu"),
        },
        {
            name: "Notification",
            icon: <BellIcon className="h-5 w-5" />,
            onClick: () => setActiveComponent("Notification"),
        },
        // {
        //     name: "Braimy",
        //     icon: <MoonFilledIcon className="h-5 w-5" />,
        //     onClick: () => setActiveComponent("Braimy"),
        // },
    ];


    const visibleMenuItems = menuItems;

    const renderActiveComponent = () => {
        switch (activeComponent) {
            case "Dashboard":
                return <DashboardComponent />;
            case "Search":
                return <SearchBar setActiveItem={setActiveComponent} />;
            case "Menu":
                return <GeneralComponent initialMenuItem={generalMenuItem} />; // Pass generalMenuItem as prop
            case "Notification":
                return <AttendanceRootComponent />;
            case "Braimy":
                return <ConfigureRootComponent />;
            case "Class":
                return <ClassRootComponent />;
            case "Subjects":
                return <SubjectsRootComponent />;
            case "CenterAction":
                return <div className="p-6 bg-white rounded-md shadow-sm border">Center Action Content</div>; // Example for center action - styled
            default:
                return <div className="p-6 bg-white rounded-md shadow-sm border text-center text-gray-500">Select a menu item from below.</div>; // Styled default message
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100"> {/* Changed h-screen to min-h-screen and bg-gray-100 for softer background */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto p-2"> {/* Added padding to content area, overflow-y-auto for vertical scroll */}
                <div className="container mx-auto max-w-3xl"> {/* Added container for max width on larger mobiles/small tablets */}
                    {renderActiveComponent()}
                    <Outlet />
                </div>
            </div>
            <div className="sticky bottom-0 bg-slate-300/25 rounded-t-lg backdrop-blur-sm border-t border-gray-200"> {/*  White background with transparency, blur, border, sticky footer */}
                <div className="container mx-auto max-w-3xl"> {/* Container for nav menu to align with content */}
                    <MobileNavMenu
                        menuItems={visibleMenuItems}
                        activeItemName={activeComponent}
                        setActiveItemName={setActiveComponent}
                    />
                </div>
            </div>
        </div>
    );
};

export default Layout;