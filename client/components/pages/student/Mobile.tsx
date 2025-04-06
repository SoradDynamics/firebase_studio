// app/layout.tsx
import React, { useState, useEffect, useRef } from "react";
import MobileNavMenu from "components/common/MobileNavMenu";
import { Outlet } from "@remix-run/react";
import GeneralComponent from "./General";
import { BellIcon, DashboardIcon, SearchIcon, SidebarIcon } from "components/icons";
import SearchBar from "./SearchBar-Mob";
import DashboardContent from "./components/DashboardContent";
import { useStudentData , StudentDataProvider} from "./StudentContext";


const Layout: React.FC = () => {

  const [activeComponent, setActiveComponentState] = useState<string>(() => {
    const storedActive = localStorage.getItem("activeMobileMenu") || "Dashboard";
    return storedActive;
  });
  const [generalMenuItem, setGeneralMenuItem] = useState<string | null>(() => {
    return localStorage.getItem('generalComponentMenuItem') || null;
  });

  const initialRenderRef = useRef(true);

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      const storedActiveComponent = localStorage.getItem("activeMobileMenu");
      const storedGeneralMenuItem = localStorage.getItem("generalComponentMenuItem");
      if (storedActiveComponent && ["Dashboard", "Search", "Menu", "Notification", "Braimy", "Class", "Subjects", "CenterAction"].includes(storedActiveComponent)) {
        setActiveComponentState(storedActiveComponent);
      } else {
        setActiveComponentState("Dashboard");
      }
      if (storedGeneralMenuItem) {
        setGeneralMenuItem(storedGeneralMenuItem);
      }
    }
  }, []);


  useEffect(() => {
    localStorage.setItem("activeMobileMenu", activeComponent);
  }, [activeComponent]);

  useEffect(() => {
    localStorage.setItem("generalComponentMenuItem", generalMenuItem || '');
  }, [generalMenuItem]);


  const setActiveComponent = (componentName: string, generalMenuItemName?: string) => {
    setActiveComponentState(componentName);
    if (componentName === "Menu") {
      if (generalMenuItemName) {
        setGeneralMenuItem(generalMenuItemName);
      } else if (!generalMenuItemName && localStorage.getItem('generalComponentMenuItem')) {
        setGeneralMenuItem(localStorage.getItem('generalComponentMenuItem'));
      } else {
        setGeneralMenuItem(null);
      }
    } else {
      setGeneralMenuItem(null);
    }
  };

  // Define components inline
  const DashboardComponent = () => (
    <div className="p-4 break-words bg-white rounded-md shadow-sm border">
      <h2 className="text-lg font-semibold mb-2">Dashboard</h2>
      <p className="text-gray-700">
        Welcome to your dashboard! This is where you can see an overview of your system.
      </p>
    </div>
  );

  const AttendanceRootComponent = () => (
    <div className="p-6 bg-white rounded-md shadow-sm border">
      <h2 className="text-lg font-semibold mb-2">Notifications</h2>
      <p className="text-gray-700">
        Check your latest notifications and updates here.
      </p>
    </div>
  );
  const ConfigureRootComponent = () => (
    <div className="p-6 bg-white rounded-md shadow-sm border">
      <h2 className="text-lg font-semibold mb-2">Braimy Settings</h2>
      <p className="text-gray-700">
        Configure Braimy related settings.
      </p>
    </div>
  );
  const ClassRootComponent = () => (
    <div className="p-6 bg-white rounded-md shadow-sm border">
      <h2 className="text-lg font-semibold mb-2">Classes</h2>
      <p className="text-gray-700">
        Manage your classes and schedules.
      </p>
    </div>
  );
  const SubjectsRootComponent = () => (
    <div className="p-6 bg-white rounded-md shadow-sm border">
      <h2 className="text-lg font-semibold mb-2">Subjects</h2>
      <p className="text-gray-700">
        View and manage subjects.
      </p>
    </div>
  );

  const menuItems = [
    {
      name: "Dashboard",
      icon: <DashboardIcon className="h-5 w-5" />,
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
  ];


  const visibleMenuItems = menuItems;

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case "Dashboard":
        return <DashboardContent />;
      case "Search":
        return <SearchBar setActiveItem={setActiveComponent} />;
      case "Menu":
        return <GeneralComponent initialMenuItem={generalMenuItem} />;
      case "Notification":
        return <AttendanceRootComponent />;
      case "Braimy":
        return <ConfigureRootComponent />;
      case "Class":
        return <ClassRootComponent />;
      case "Subjects":
        return <SubjectsRootComponent />;
      case "CenterAction":
        return <div className="p-6 bg-white rounded-md shadow-sm border">Center Action Content</div>;
      default:
        return <div className="p-6 bg-white rounded-md shadow-sm border text-center text-gray-500">Select a menu item from below.</div>;
    }
  };

  return (
    <StudentDataProvider>

    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-2">
        <div className="container mx-auto max-w-3xl">
          {renderActiveComponent()}
          <Outlet />
        </div>
      </div>
      <div className="sticky bottom-0 bg-slate-300/25 rounded-t-lg backdrop-blur-sm border-t border-gray-200">
        <div className="container mx-auto max-w-3xl">
          <MobileNavMenu
            menuItems={visibleMenuItems}
            activeItemName={activeComponent}
            setActiveItemName={setActiveComponent}
          />
        </div>
      </div>
    </div>
    </StudentDataProvider>

  );
};

export default Layout;