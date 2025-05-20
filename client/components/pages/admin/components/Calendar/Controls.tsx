// src/components/Calendar/Controls.tsx (or wherever Controls.tsx is located)
import React, { useState } from "react";
import {
  // Modal, // Removed
  // ModalContent, // Removed
  // ModalHeader, // Removed (from heroui)
  // ModalBody, // Removed (from heroui)
  // ModalFooter, // Removed (from heroui)
  Button,
  Input,
  Checkbox,
} from "@heroui/react";
import {Drawer} from "../../../../common/Drawer"; // Adjust path to your Drawer.tsx (assuming common is two levels up)
import { bsToAd } from "@sbmdkl/nepali-date-converter";
import { databases, ID } from "~/utils/appwrite";
import toast from "react-hot-toast";
import { FaPlus } from "react-icons/fa6";
import ActionButton from "../../../../common/ActionButton"; // Assuming this path is correct

interface ControlsProps {
  onEventSaved: () => void;
}

// Database and Collection IDs from environment variables
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_CALENDAR_COLLECTION_ID;

const Controls: React.FC<ControlsProps> = ({ onEventSaved }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Renamed from isModalOpen
  const [name, setName] = useState("");
  const [dateFromBs, setDateFromBs] = useState("");
  const [dateToBs, setDateToBs] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSingleDateEvent, setIsSingleDateEvent] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true); // Renamed from openModal
  const closeDrawer = () => { // Renamed from closeModal
    setIsDrawerOpen(false);
    setName("");
    setDateFromBs("");
    setDateToBs("");
    setIsHoliday(false);
    setIsSingleDateEvent(false);
    setLoading(false); // Also reset loading state on close
  };

  const convertBsToAdDate = (bsDate: string): string | null => {
    if (!bsDate || !bsDate.trim()) {
      return null;
    }
    try {
      if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(bsDate)) {
        throw new Error("Input does not match YYYY-MM-DD format.");
      }
      const adDate = bsToAd(bsDate);
      return adDate;
    } catch (error: any) {
      console.error(`Error converting BS date "${bsDate}" to AD:`, error.message);
      return null;
    }
  };

  const saveCalendarEvent = async () => {
    setLoading(true);
    let validationError = "";

    if (!name.trim()) {
      validationError = "Event Name is required.";
    } else if (!dateFromBs.trim()) {
      validationError = "'Date From' is required.";
    }

    if (validationError) {
      toast.error(validationError);
      setLoading(false);
      return;
    }

    const dateFromAd = convertBsToAdDate(dateFromBs);
    let dateToAd: string | null = null;

    if (!dateFromAd) {
      toast.error("Invalid 'Date From' format. Please use YYYY-MM-DD.");
      setLoading(false);
      return;
    }

    let datesArray: string[];

    if (isSingleDateEvent) {
      datesArray = [dateFromAd];
    } else {
      if (!dateToBs.trim()) {
        toast.error("'Date To' is required for date range events.");
        setLoading(false);
        return;
      }
      dateToAd = convertBsToAdDate(dateToBs);
      if (!dateToAd) {
        toast.error("Invalid 'Date To' format. Please use YYYY-MM-DD.");
        setLoading(false);
        return;
      }
      try {
        if (new Date(dateFromAd) > new Date(dateToAd)) {
          toast.error("'Date From' cannot be after 'Date To'.");
          setLoading(false);
          return;
        }
      } catch (e) {
        // Handle potential date parsing errors if needed
      }
      datesArray = [dateFromAd, dateToAd];
    }

    const dataPayload = {
      name: name.trim(),
      dates: datesArray,
      holiday: isHoliday,
    };

    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        dataPayload
      );
      toast.success("Calendar event saved successfully!");
      closeDrawer(); // Close drawer on success
      onEventSaved();
    } catch (error: any) {
      console.error("Appwrite error", error);
      toast.error(`Failed to save event: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-2 sm:px-0 mt-1 ">
      <ActionButton
        icon={<FaPlus className="w-4 h-4 text-gray-100 transition duration-200" />}
        onClick={openDrawer} // Changed to openDrawer
        color="orange"
        aria-label="Add Event" // More generic label if used for more than faculty
      />

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer} // Use the main close handler for the Drawer
        // position="right" // Default
        // size="md" // Default
      >
        <Drawer.Header>
          <h1 className="text-xl font-semibold">Add New Event</h1>
        </Drawer.Header>
        <Drawer.Body>
          {/* Drawer.Body has p-4 by default. The inner div manages the gap. */}
          <div className="flex flex-col gap-3">
            <Input
              isRequired
              type="text"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-medium"
              variant="underlined"
              color="secondary"
            />
            <Input
              isRequired
              type="text"
              label="Date From (BS YYYY-MM-DD)"
              value={dateFromBs}
              onChange={(e) => setDateFromBs(e.target.value)}
              variant="underlined"
              color="secondary"
              className="font-medium"
            />
            {!isSingleDateEvent && (
              <Input
                isRequired
                type="text"
                label="Date To (BS YYYY-MM-DD)"
                value={dateToBs}
                onChange={(e) => setDateToBs(e.target.value)}
                variant="underlined"
                color="secondary"
                className="mb-1 font-medium" // Reduced mb as Drawer.Body provides padding
              />
            )}
            <div className="flex flex-col sm:flex-row gap-4 mt-2"> {/* Added mt-2 for spacing after inputs */}
              <Checkbox
                isSelected={isHoliday}
                onChange={(e) => setIsHoliday(e.target.checked)}
              >
                Holiday
              </Checkbox>
              <Checkbox
                isSelected={isSingleDateEvent}
                onChange={(e) => {
                  setIsSingleDateEvent(e.target.checked);
                  if (e.target.checked) {
                    setDateToBs("");
                  }
                }}
              >
                Single Day Event
              </Checkbox>
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer className="px-10 mb-1"> {/* Retaining original ModalFooter classes */}
          <Button color="danger" variant="light" onPress={closeDrawer} disabled={loading}>
            Cancel
          </Button>
          <Button
            color="success"
            className="text-white font-medium"
            onPress={saveCalendarEvent}
            isLoading={loading}
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  );
};

export default Controls;