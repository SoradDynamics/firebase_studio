// src/features/fee-config/types.ts
import { Models } from 'appwrite';

export interface Faculty extends Models.Document {
  name: string;
  classes: string[]; // Array of class names, e.g., ["Class 6", "Class 7", "Class 10"]
}

// For UI interaction and form state in the drawer
export interface FeeItem {
  id: string; // Unique key for lists/forms, can be temp for UI
  title: string;
  amount: number;
}

// Represents a document in fees_config collection
export interface FeeConfigDocument extends Models.Document {
  facultyId: string;
  className: string; // e.g., "Class 10"
  desc: string[]; // Stored as ["title:amount", "title:amount"]
}

// Processed Fee Configuration for UI display and drawer state
export interface ProcessedFeeConfig {
  $id?: string; // Appwrite document ID of the fee_config document, present if it's an existing config
  facultyId: string;
  className: string; // The class name (e.g. "Class 10")
  fees: FeeItem[];
}

// Information for displaying each Class card on the main page
export interface ClassFeeDisplayInfo {
  key: string; // A unique key for React list rendering (e.g., facultyId-className)
  facultyId: string;
  facultyName: string;
  className: string; // The actual class name from faculty.classes[], e.g., "Class 10"
  processedFeeConfig?: ProcessedFeeConfig; // Contains parsed fees and $id if a config exists for this class
}