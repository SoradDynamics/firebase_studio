// app/data/searchItems.ts
import { AdjustmentsHorizontalIcon, BuildingOfficeIcon, DocumentTextIcon, HomeIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { BookIcon, CalendarIcon } from "components/icons";

export type SearchItem = {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  location: string; // Add the location property
};

export const searchItems: SearchItem[] = [
  {
    id: "1",
    icon: HomeIcon,
    title: "Dashboard",
    description: "View your dashboard",
    location: "Dashboard", 
  },
  {
    id: "2",
    icon: DocumentTextIcon,
    title: "Student >> General",
    description: "Students general component (admission)",
    location: "General", 
  },
  {
    id: "3",
    icon: BookIcon,
    title: "Student >> Section",
    description: "Update students sections",
    location: "Section", 
  },
  {
    id: "4",
    icon: AdjustmentsHorizontalIcon,
    title: "Student >> Attendance",
    description: "Manage student attendance",
    location: "Attendance", 
  },
  {
    id: "5",
    icon: BuildingOfficeIcon,
    title: "Configure >> Faculty & Class",
    description: "Configure faculties and classes",
    location: "Faculty & Class", 
  },
  {
    id: "6",
    icon: BookIcon,
    title: "Configure >> Section & Subject",
    description: "Configure sections and subjects",
    location: "Section & Subject", 
  },
  {
    id: "7",
    icon: CalendarIcon,
    title: "Calendar",
    description: "Neplai calendar for your time series",
    location: "Calendar", 
  },

];
