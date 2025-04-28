// src/pages/Admin/Notifications/components/AddNotificationDrawer.tsx
import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { Button, Input, Textarea } from '@heroui/react'; // Keep only needed HeroUI components
import { toast } from 'react-hot-toast';
import { bsToAd } from "@sbmdkl/nepali-date-converter";
import { Models } from 'appwrite';
import { databases, account, iD as ID, Query } from '~/utils/appwrite'; // Adjust path if needed
import { Drawer } from '../../../../common/Drawer'; // Adjust path if needed

// --- Appwrite Configuration ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const NOTIFY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_NOTIFY_COLLECTION_ID;
const FACULTY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FACULTY_COLLECTION_ID;
// No Class Collection ID needed
const SECTION_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SECTION_COLLECTION_ID;

// --- Helper Types (Match your Appwrite collection attributes) ---
interface Faculty extends Models.Document {
  name: string;
  classes: string[]; // Array of class name strings
}
// No separate Class interface needed
interface Section extends Models.Document {
  name: string;
  class: string; // Stores the class name string (e.g., "Class 10")
  facultyId: string; // ID of the related Faculty document
  subjects?: string[]; // Added from schema just in case
}
type NotificationRole = 'student' | 'parent' | 'faculty' | 'admin'; // Define possible roles

// --- Component Props ---
interface AddNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; // Callback after successful save
}

// --- BS to AD Date Conversion Helper ---
const convertBsToAdDate = (bsDate: string): string | null => {
    if (!bsDate || !bsDate.trim()) return null;
    try {
        if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(bsDate)) throw new Error("Input must be YYYY-MM-DD.");
        const adDate = bsToAd(bsDate);
        return adDate; // 'YYYY-MM-DD'
    } catch (error: any) {
        console.error(`BS to AD conversion error for "${bsDate}":`, error.message);
        toast.error(`Invalid BS Date: ${error.message}`);
        return null;
    }
};

// --- Base Select Styling --- (Adjust as needed)
const selectBaseClasses = "block w-full px-3 py-2 text-base text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed";
const labelBaseClasses = "block text-sm font-medium text-gray-700 mb-1";

// --- The Drawer Component ---
const AddNotificationDrawer: React.FC<AddNotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  // --- State ---
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<NotificationRole | ''>(''); // Use '' for empty state with standard select
  const [selectedFaculty, setSelectedFaculty] = useState<string>(''); // Stores faculty $id
  const [selectedClass, setSelectedClass] = useState<string>('');     // Stores class NAME string
  const [selectedSection, setSelectedSection] = useState<string>(''); // Stores section $id
  const [bsValidDate, setBsValidDate] = useState<string>('');         // BS Date input

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  // No separate classes state needed
  const [sections, setSections] = useState<Section[]>([]);

  const [isLoadingFaculties, setIsLoadingFaculties] = useState<boolean>(false);
  // No isLoadingClasses state needed
  const [isLoadingSections, setIsLoadingSections] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [senderId, setSenderId] = useState<string | null>(null);

  // --- Effects ---

  // Fetch Sender ID
  useEffect(() => {
    const fetchUserId = async () => { if (senderId || !isOpen) return; try { const u = await account.get(); setSenderId(u.$id); } catch (e) { console.error("Failed to get sender ID:", e); toast.error("Could not identify sender."); } }; fetchUserId();
  }, [isOpen, senderId]);

  // Fetch Faculties
  useEffect(() => {
    if (!isOpen) return; const fetch = async () => { setIsLoadingFaculties(true); setFaculties([]); try { if (!F || !D) throw Error("Faculty Config missing"); const r = await databases.listDocuments<Faculty>(D, F, [Q.limit(200), Q.orderAsc("name")]); setFaculties(r.documents); } catch (e: any) { console.error("Faculty fetch failed:", e); toast.error(e.message || "Could not load faculties."); } finally { setIsLoadingFaculties(false); } }; const F=FACULTY_COLLECTION_ID, D=DATABASE_ID, Q=Query; fetch();
  }, [isOpen]);

  // Fetch Sections (conditional on role, faculty, and class NAME)
  useEffect(() => {
    if (selectedRole !== 'student' || !selectedFaculty || !selectedClass) { setSections([]); setSelectedSection(''); return; } if (!isOpen) return;
    const fetchSections = async () => { setIsLoadingSections(true); setSections([]); setSelectedSection(''); try { if (!S || !D) throw Error("Section Config missing"); const q: string[] = [Q.limit(100), Q.equal('facultyId', selectedFaculty), Q.equal('class', selectedClass), Q.orderAsc("name") ]; const r = await databases.listDocuments<Section>(D, S, q); setSections(r.documents); } catch (error: any) { if (error.message?.includes('Attribute not found')) { console.error("Section Fetch Error: Schema mismatch.", error); toast.error("Error loading sections: Check schema ('class'/'facultyId')."); } else { console.error("Section fetch failed:", error); toast.error(`Could not load sections: ${error.message || 'Unknown error'}`); } setSections([]); } finally { setIsLoadingSections(false); } }; const S=SECTION_COLLECTION_ID, D=DATABASE_ID, Q=Query; fetchSections();
  }, [isOpen, selectedRole, selectedFaculty, selectedClass]); // Dependencies

  // Reset Form on Close
  useEffect(() => {
    if (!isOpen) { setTitle(''); setMessage(''); setSelectedRole(''); setSelectedFaculty(''); setSelectedClass(''); setSelectedSection(''); setBsValidDate(''); setIsSaving(false); }
  }, [isOpen]);

  // --- Derived State ---
  // Get class names for the selected faculty
  const availableClasses = useMemo(() => {
    if (!selectedFaculty) return [];
    const faculty = faculties.find(f => f.$id === selectedFaculty);
    // Ensure classes is an array before returning
    return Array.isArray(faculty?.classes) ? faculty.classes : [];
  }, [selectedFaculty, faculties]);

  // --- Action Handlers ---
  const handleSave = useCallback(async () => {
    // Validations
    if (!title.trim()) return toast.error('Title is required.');
    if (!message.trim()) return toast.error('Message is required.');
    if (!bsValidDate.trim()) return toast.error('Valid Until date (BS) is required.');
    if (!selectedRole) return toast.error('Target Role is required.');
    if (!senderId) return toast.error("Cannot save: Sender unknown.");

    // Date Conversion
    const adValidDate = convertBsToAdDate(bsValidDate);
    if (!adValidDate) return; // Error handled in helper

    setIsSaving(true);
    try {
      // Construct Targets
      const targets: string[] = [`role:${selectedRole}`];
      if (selectedRole === 'student') {
        if (selectedFaculty) targets.push(`faculty:${selectedFaculty}`);
        if (selectedClass) targets.push(`class:${selectedClass}`); // Class NAME string
        if (selectedSection) targets.push(`section:${selectedSection}`); // Section $id
      }

      // Check Config
      if (!DATABASE_ID || !NOTIFY_COLLECTION_ID) throw new Error("DB/Notify Config missing.");

      // *** Format Dates according to Schema (String, max 20) ***
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayDateString = `${year}-${month}-${day}`; // 'YYYY-MM-DD' (10 chars)

      // Prepare Data
      const notificationData = {
        title: title.trim(),
        msg: message.trim(),
        to: targets,
        valid: adValidDate, // 'YYYY-MM-DD' string (10 chars)
        sender: senderId,
        date: todayDateString, // 'YYYY-MM-DD' string (10 chars) - CORRECTED
      };

      // Create Document
      await databases.createDocument(
        DATABASE_ID,
        NOTIFY_COLLECTION_ID,
        ID.unique(),
        notificationData
      );

      toast.success('Notification created!');
      onSaveSuccess();
      onClose();

    } catch (error: any) {
      console.error('Save failed:', error);
      toast.error(`Save failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [ // Dependencies
    title, message, selectedRole, selectedFaculty, selectedClass, selectedSection,
    bsValidDate, senderId, onClose, onSaveSuccess
  ]);

  // Event Handlers for Selects
  const handleRoleChange = (e: ChangeEvent<HTMLSelectElement>) => {
      setSelectedRole(e.target.value as NotificationRole | '');
      setSelectedFaculty(''); setSelectedClass(''); setSelectedSection(''); // Reset dependents
  };
  const handleFacultyChange = (e: ChangeEvent<HTMLSelectElement>) => {
      setSelectedFaculty(e.target.value);
      setSelectedClass(''); setSelectedSection(''); // Reset dependents
  };
   const handleClassChange = (e: ChangeEvent<HTMLSelectElement>) => {
       setSelectedClass(e.target.value);
       setSelectedSection(''); // Reset dependent
   };

  // --- Render ---
  return (
    <Drawer isOpen={isOpen} onClose={onClose} position="right" size="lg">
      <Drawer.Header showCloseButton={true}> Add New Notification </Drawer.Header>
      <Drawer.Body>
        <form className="space-y-4 md:space-y-5" onSubmit={(e) => e.preventDefault()}>

          {/* Title */}
          <Input label="Title" placeholder="Enter notification title" value={title} onValueChange={setTitle} isRequired disabled={isSaving} maxLength={150} />

          {/* Message */}
          <Textarea label="Message" placeholder="Enter notification message content..." value={message} onValueChange={setMessage} isRequired minRows={4} disabled={isSaving} />

          {/* --- Targeting Section --- */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Target Audience</h3>

            {/* Role Selection */}
            <div>
              <label htmlFor="role-select" className={labelBaseClasses}> Target Role <span className="text-red-500">*</span></label>
              <select id="role-select" value={selectedRole} onChange={handleRoleChange} className={selectBaseClasses} disabled={isSaving} required>
                <option value="" disabled> -- Select a Role -- </option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* --- Conditional Student Targeting --- */}
            {selectedRole === 'student' && (
              <div className="pl-4 ml-1 border-l-2 border-blue-400 space-y-4 mt-3 pb-1">
                <p className="text-xs text-gray-600 italic">Optional: Refine student target</p>

                {/* Faculty Select */}
                <div>
                  <label htmlFor="faculty-select" className={labelBaseClasses}> Target Faculty </label>
                  <select id="faculty-select" value={selectedFaculty} onChange={handleFacultyChange} className={selectBaseClasses} disabled={isSaving || isLoadingFaculties}>
                    <option value=""> -- All Faculties -- </option>
                    {faculties.map((faculty) => ( <option key={faculty.$id} value={faculty.$id}> {faculty.name} </option> ))}
                  </select>
                  {isLoadingFaculties && <p className="text-xs text-gray-500 mt-1">Loading faculties...</p>}
                </div>

                {/* Class Select (Populated from selected Faculty) */}
                <div>
                  <label htmlFor="class-select" className={labelBaseClasses}> Target Class </label>
                  <select id="class-select" value={selectedClass} onChange={handleClassChange} className={selectBaseClasses} disabled={isSaving || isLoadingFaculties || !selectedFaculty} >
                    <option value=""> -- All Classes -- </option>
                    {/* Map over derived availableClasses (array of strings) */}
                    {availableClasses.map((className) => ( <option key={className} value={className}> {className} </option> ))}
                  </select>
                  {!selectedFaculty && <p className="text-xs text-gray-500 mt-1">Select a faculty to see classes.</p>}
                  {selectedFaculty && availableClasses.length === 0 && !isLoadingFaculties && <p className="text-xs text-gray-500 mt-1">No classes listed for selected faculty.</p>}
                </div>

                {/* Section Select */}
                <div>
                  <label htmlFor="section-select" className={labelBaseClasses}> Target Section </label>
                  <select id="section-select" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className={selectBaseClasses} disabled={isSaving || isLoadingSections || !selectedClass}>
                    <option value=""> -- All Sections -- </option>
                    {sections.map((section) => ( <option key={section.$id} value={section.$id}> {section.name} </option> ))}
                  </select>
                  {isLoadingSections && <p className="text-xs text-gray-500 mt-1">Loading sections...</p>}
                  {!selectedClass && <p className="text-xs text-gray-500 mt-1">Select a class to load sections.</p>}
                  {selectedClass && sections.length === 0 && !isLoadingSections && <p className="text-xs text-gray-500 mt-1">No sections found for selected class/faculty.</p>}
                </div>
              </div>
            )}
            {/* End Conditional Student Targeting */}
          </div>

          {/* --- Validity Date Input --- */}
          <div className="border-t pt-4">
            <Input type="text" label={<>Valid Until (BS Date) <span className="text-red-500">*</span></>} placeholder="YYYY-MM-DD" value={bsValidDate} onValueChange={setBsValidDate} isRequired disabled={isSaving} pattern="\d{4}-\d{1,2}-\d{1,2}" maxLength={10} />
          </div>

        </form>
      </Drawer.Body>
      <Drawer.Footer>
        <Button variant="light" onPress={onClose} disabled={isSaving}> Cancel </Button>
        <Button color="primary" onPress={handleSave} isLoading={isSaving} disabled={isSaving || !senderId}>
          {isSaving ? 'Saving...' : 'Create Notification'}
        </Button>
      </Drawer.Footer>
    </Drawer>
  );
};

export default AddNotificationDrawer;