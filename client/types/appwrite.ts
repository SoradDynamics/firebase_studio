// ~/types/appwrite.ts
import { Models } from 'appwrite';

export interface NotifyDoc extends Models.Document {
    title: string;
    msg: string;
    to: string[]; // Array of strings like "id:...", "role:...", "facultyId:..."
    valid: string; // ISO Date string
    sender?: string; // Optional sender info
    date: string; // ISO Date string
}

export interface StudentDoc extends Models.Document {
    id: string; // Appwrite User ID ($id from Auth)
    name: string;
    class: string;
    facultyId: string;
    section: string;
    stdEmail?: string;
    parentId?: string;
    absent?: string[];
}

// Representing the core user data needed for filtering
export interface UserFilterData {
    id: string;
    roles: string[];
    facultyId: string | null;
    class: string | null;
    section: string | null;
}

export type Document<T> = T & Models.Document;