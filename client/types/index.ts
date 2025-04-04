import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// ~/types/index.ts
export interface Faculty {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $updatedBy?: string; // Make $updatedBy optional as it might not always be present
  id: string;
  name: string;
  classes: string[];
}

export interface Section {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  subjects: string[];
  class: string;
  facultyId?: string;

}

export interface Parent {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  id: string;
  name: string;
  email: string;
  contact: string[];
  students: string[];
}