// src/components/Controls.tsx
import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Checkbox,
} from "@heroui/react";
import { bsToAd } from "@sbmdkl/nepali-date-converter";
import { databases, ID } from "~/utils/appwrite";
import toast from "react-hot-toast"; // Import react-hot-toast
import { FaPlus } from "react-icons/fa6";
import ActionButton from "../common/ActionButton";

interface ControlsProps {
  onEventSaved: () => void;
}

// Database and Collection IDs from environment variables
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_CALENDAR_COLLECTION_ID;

const Controls: React.FC<ControlsProps> = ({ onEventSaved }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [dateFromBs, setDateFromBs] = useState("");
  const [dateToBs, setDateToBs] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [loading, setLoading] = useState(false);
  // Remove errorMessage state - we'll use toasts
  // const [errorMessage, setErrorMessage] = useState("");
  const [isSingleDateEvent, setIsSingleDateEvent] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    // Reset form fields on close as well
    setName("");
    setDateFromBs("");
    setDateToBs("");
    setIsHoliday(false);
    setIsSingleDateEvent(false);
    // No need to clear errorMessage state anymore
  };

  // Modified: Removed the side effect of setting state here
  const convertBsToAdDate = (bsDate: string): string | null => {
    if (!bsDate || !bsDate.trim()) {
      // Handle empty input explicitly before conversion library
      // console.log("convertBsToAdDate received empty input");
      return null;
    }
    try {
      // Basic format check (more robust regex could be used)
      if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(bsDate)) {
        throw new Error("Input does not match YYYY-MM-DD format.");
      }
      const adDate = bsToAd(bsDate);
      return adDate; // Should return format like "YYYY-MM-DD"
    } catch (error: any) {
      console.error(
        `Error converting BS date "${bsDate}" to AD:`,
        error.message
      );
      // Return null, let the caller handle the error message via toast
      return null;
    }
  };

  const saveCalendarEvent = async () => {
    setLoading(true);
    // No need to clear messages state

    let validationError = ""; // Use a local variable for validation messages

    // --- Input Validation ---
    if (!name.trim()) {
      validationError = "Event Name is required.";
    } else if (!dateFromBs.trim()) {
      validationError = "'Date From' is required.";
    }
    // Add more specific validation if needed (e.g., regex for date format before conversion)

    if (validationError) {
      toast.error(validationError);
      setLoading(false);
      return;
    }

    // --- Date Conversion & Validation ---
    const dateFromAd = convertBsToAdDate(dateFromBs);
    let dateToAd: string | null = null; // Initialize dateToAd

    if (!dateFromAd) {
      toast.error("Invalid 'Date From' format. Please use YYYY-MM-DD.");
      setLoading(false);
      return;
    }

    let datesArray: string[];

    if (isSingleDateEvent) {
      // For single day event, only use dateFromAd
      datesArray = [dateFromAd];
      // console.log("Single day event - using only dateFrom:", datesArray);
    } else {
      // For a range event, 'Date To' is required
      if (!dateToBs.trim()) {
        toast.error("'Date To' is required for date range events.");
        setLoading(false);
        return;
      }
      // Convert 'Date To' ONLY if it's a range event
      dateToAd = convertBsToAdDate(dateToBs);
      if (!dateToAd) {
        toast.error("Invalid 'Date To' format. Please use YYYY-MM-DD.");
        setLoading(false);
        return;
      }
      // Optional: Check if start date is before end date
      try {
        if (new Date(dateFromAd) > new Date(dateToAd)) {
          toast.error("'Date From' cannot be after 'Date To'.");
          setLoading(false);
          return;
        }
      } catch (e) {
        /* Handle potential date parsing errors if needed, though conversion should catch most */
      }

      datesArray = [dateFromAd, dateToAd];
      // console.log("Date range event - using dateFrom and dateTo:", datesArray);
    }

    // --- Prepare and Send Data ---
    const dataPayload = {
      name: name.trim(), // Trim name just in case
      dates: datesArray,
      holiday: isHoliday,
    };
    // console.log("Data being sent to Appwrite:", dataPayload);

    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        dataPayload
      );

      // console.log("Appwrite response", response);
      toast.success("Calendar event saved successfully!"); // Success Toast
      // Reset form state AFTER successful save
      setName("");
      setDateFromBs("");
      setDateToBs("");
      setIsHoliday(false);
      setIsSingleDateEvent(false);
      closeModal(); // Close modal on success
      onEventSaved(); // Trigger data refetch in Calendar.tsx
    } catch (error: any) {
      console.error("Appwrite error", error);
      toast.error(`Failed to save event: ${error.message}`); // Error Toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-2 sm:px-0 mt-1 ">
      {" "}
      {/* Added padding/margin */}
      <ActionButton
          icon={
            <FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />
          }
          onClick={openModal}
          color="orange"
          aria-label="Add Faculty"
          
        />



      <Modal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        backdrop="blur"
        onClose={closeModal} // Ensure form resets if modal is closed via backdrop click etc.
      >
        <ModalContent>
          {(
            onClose // onClose is provided by ModalContent
          ) => (
            <>
              
              <ModalBody className=" py-4">
              <div className="flex flex-col gap-2 px-4">
                  <h1 className=" text-xl font-semibold mt-2 mb-1.5">Add New Event</h1>
               
                {/* Removed the old error message paragraph */}
                <Input
                  isRequired // Add browser validation indication
                  type="text"
                  label="Name"
                  // placeholder="Event Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="font-medium"
                  variant="underlined"
                  color="secondary"
                />
                <Input
                  isRequired
                  type="text" // Consider type="date" if AD format is acceptable, otherwise keep text
                  label="Date From (BS YYYY-MM-DD)"
                  // placeholder="YYYY-MM-DD"
                  value={dateFromBs}
                  onChange={(e) => setDateFromBs(e.target.value)}
                  variant="underlined"
                  color="secondary"
                  className="font-medium"
                  // Optional: Add pattern for basic client-side format hint
                  // pattern="\d{4}-\d{1,2}-\d{1,2}"
                />
                {!isSingleDateEvent && ( // Conditionally render Date To input
                  <Input
                    isRequired // Required only when visible
                    type="text"
                    label="Date To (BS YYYY-MM-DD)"
                    // placeholder="YYYY-MM-DD"
                    value={dateToBs}
                    onChange={(e) => setDateToBs(e.target.value)}
                    variant="underlined"
                  color="secondary"
                  className="mb-4 font-medium"
                    // pattern="\d{4}-\d{1,2}-\d{1,2}"
                  />
                )}
                <div className="flex flex-col sm:flex-row gap-4 ">
                  {" "}
                  {/* Layout checkboxes */}
                  <Checkbox
                    isSelected={isHoliday}
                    onChange={(e) => setIsHoliday(e.target.checked)}
                    // Removed mb-2, using gap now
                  >
                    Holiday
                  </Checkbox>
                  <Checkbox
                    isSelected={isSingleDateEvent}
                    onChange={(e) => {
                      setIsSingleDateEvent(e.target.checked);
                      // Optionally clear dateToBs when switching to single day
                      if (e.target.checked) {
                        setDateToBs("");
                      }
                    }}
                  >
                    Single Day Event
                  </Checkbox>
                </div>
                </div>
              </ModalBody>
              <ModalFooter className=" px-10 mb-1">
                <Button color="danger" variant="light" onPress={onClose}>
                  {" "}
                  {/* Use provided onClose */}
                  Cancel
                </Button>
                <Button
                  color="success"
                className=" text-white font-medium"

                  onPress={saveCalendarEvent}
                  isLoading={loading}
                >
                  Save 
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Controls;
