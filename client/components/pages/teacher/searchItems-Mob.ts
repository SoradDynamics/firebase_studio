{/* searchitem.tsx */}
// app/data/searchItems.ts
import { AdjustmentsHorizontalIcon, CalendarIcon, DocumentTextIcon, HomeIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { CogIcon, CalendarDaysIcon, BookOpenIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { BookIcon, UserIcon } from "components/icons";

export type SearchItem = {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
    location: string; // 'Menu', 'Dashboard', etc. - for top-level component
    generalMenuLocation?: string; // Optional: Specific menu item in GeneralComponent
};

export const searchItems: SearchItem[] = [
    {
        id: "1",
        icon: UserIcon,
        title: "Profile",
        description: "View your profile",
        location: "Menu",
        generalMenuLocation: "Profile",
    },
    {
        id: "2",
        icon: DocumentTextIcon,
        title: "Student >> General",
        description: "Students general component (admission)",
        location: "Menu", 
        generalMenuLocation: "General"
      },
      {
        id: "3",
        icon: BookIcon,
        title: "Student >> Section",
        description: "Update students sections",
        location: "Menu", 
        generalMenuLocation: "Section"
      },
      {
        id: "4",
        icon: AdjustmentsHorizontalIcon,
        title: "Student >> Attendance",
        description: "Manage student attendance",
        location: "Menu", 
        generalMenuLocation: "Attendance"
    },
      {
        id: "5",
        icon: BuildingOfficeIcon,
        title: "Configure >> Faculty & Class",
        description: "Configure faculties and classes",
        location: "Faculty & Class", 
        generalMenuLocation: "Faculty & Classes", // Specify 'Faculty & Classes' menu item in GeneralComponent
      },
      {
        id: "6",
        icon: BookIcon,
        title: "Configure >> Section & Subject",
        description: "Configure sections and subjects",
        location: "Menu", 
        generalMenuLocation: "Section & Subject"
      },
     {
        id: "7",
        icon: CalendarIcon,
        title: "Calendar",
        description: "Neplai calendar for your time series",
        location: "Calendar", 
      },
    
   
];