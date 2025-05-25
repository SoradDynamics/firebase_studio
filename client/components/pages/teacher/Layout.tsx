// app/routes/__layout.tsx
import { Outlet } from "@remix-run/react";
import Sidebar from "components/common/Sidebar";
import Navbar from "./Navbar"; // Import Navbar
import { TeacherProvider } from "./context/TeacherContext";

import { useState, useEffect } from "react";
import {
  HomeIcon,
  UserCircleIcon,
  CogIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import { BellIcon, BookIcon, BusIcon, CalendarIcon, ImportIcon, MapIcon, UsersIcon, WrenchIcon } from "components/icons";
import ApproveLeavePage from "./components/LeaveApprove/ApproveLeavePage";
import TeacherMarksEntryPage from "../common/Result/components/TeacherMarksEntryPage";
import AssignClassTeacherPage from "../admin/components/ClassTeacher/AssignClassTeacherPage";
import TeacherAssignmentsPage from "./components/Assignment/TeacherAssignmentsPage";
import NotesPage from "../common/Notes/NotesPage";
import LessonPlanPage from "./components/LessonPlan/LessonPlanPage";


// Define dummy components
const DashboardComponent = () => <div><h2>Dashboard Component</h2><p>This is the  content.</p></div>;
const GeneralComponent = () => <div><h2>General Component</h2><p>This is the General content under Students.</p></div>;
const StudentsComponent = () => <div><h2>Students Main Component</h2><p>This is the main Students content.</p></div>;
const ConfigureComponent = () => <div><h2>Configure Main Component</h2><p>This is the main Configure content.</p></div>;


export default function Layout() {
  // Initialize sidebarState from localStorage or default to 0
  const [sidebarState, setSidebarState] = useState<number>(() => {
    const storedState = localStorage.getItem('sidebarState');
    return storedState ? parseInt(storedState, 10) : 0;
  });
  const [activeItem, setActiveItem] = useState("Dashboard");

  const toggleSidebar = () => {
    setSidebarState((prevState) => {
      const newState = prevState === 0 ? 1 : 0;
      // Store the new state in localStorage
      localStorage.setItem('sidebarState', newState.toString());
      return newState;
    });
  };

  const sidebarItems = [
    { name: "Dashboard", icon: HomeIcon, component: DashboardComponent },
    { name: "Result", icon: UserCircleIcon, component: TeacherMarksEntryPage }, // Profile component
    { name: "Assignment", icon: BellIcon, component: TeacherAssignmentsPage }, // Notification component
    { name: "Notes", icon: BellIcon, component: NotesPage }, // Notification component
    { name: "Lesson Plan", icon: BellIcon, component: LessonPlanPage }, // Notification component



    {
      name: "Students",
      icon: UsersIcon,
      // component: StudentsComponent, // Main Students component
      children: [
        // { name: "General", icon: DocumentTextIcon, component: Student },
        // { name: "Section", icon: BookIcon, component:stdSection },
        // { name: "Import Data", icon: ImportIcon, component:Std_Import },

        { name: "Leave", icon: AdjustmentsHorizontalIcon, component: ApproveLeavePage },
      ],
    },
    // { name: "Calendar", icon: CalendarIcon, component: Calender},
    // { name: "Notification", icon:BellAlertIcon , component: Notification},
    { name: "Transport", icon: BusIcon,
      children:[
        { name: "Configure", icon: WrenchIcon, component:  DashboardComponent},
        { name: "Map", icon: MapIcon, component: DashboardComponent },
      ]
    },
    // {
    //   name: "Configure",
    //   icon: CogIcon,
    //   // component: ConfigureComponent, // Main Configure component
    //   children: [
    //     { name: "Faculty & Class", icon: BuildingOfficeIcon, component: Faculty },
    //     { name: "Section & Subject", icon: BookIcon, component: Section },
    //   ],
    // },

  ];

  // Function to get the component for the active item
  const getActiveComponent = () => {
    const activeSidebarItem = sidebarItems.find(item => item.name === activeItem);
    if (activeSidebarItem && activeSidebarItem.component) {
      return activeSidebarItem.component;
    }
    // Check for child items if no component found at top level
    for (const parentItem of sidebarItems) {
      if (parentItem.children) {
        const activeChildItem = parentItem.children.find(child => child.name === activeItem);
        if (activeChildItem && activeChildItem.component) {
          return activeChildItem.component;
        }
      }
    }
    return () => <div><h2>Content Not Found</h2><p>No component defined for this menu item.</p></div>; // Default component
  };

  const ActiveComponent = getActiveComponent(); // Get the active component


  return (
    <TeacherProvider>
    <div className="flex max-h-screen min-h-screen bg-gray-100/40">
      <Sidebar
        sidebarState={sidebarState}
        toggleSidebar={toggleSidebar} // Pass toggleSidebar function
        setActiveItem={setActiveItem}
        activeItem={activeItem}
        sidebarItems={sidebarItems}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} setActiveItem={setActiveItem} /> {/* Include Navbar and pass toggleSidebar */}

        {/* Main Content */}
        <main className="flex-1 overflow-auto mb-2 mr-2 max-w-full">
          {/* Render active component here */}
          <ActiveComponent />
          <Outlet /> {/* Render child routes if you are using nested routes */}
          {/* <p>Active Item: {activeItem}</p> */} {/* No need for this now */}
        </main>
      </div>
    </div>
    </TeacherProvider>
  );
}