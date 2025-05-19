// src/components/Calendar/Events.tsx
import React, { useState, useCallback } from "react";
import { adToBs, bsToAd } from "@sbmdkl/nepali-date-converter";
import Popover from "../common/Popover"; // Adjust path if necessary
import {Drawer} from "../../../../common/Drawer"; // Import Drawer
import {
  Tooltip,
  // Modal, // Removed
  // ModalContent, // Removed
  // ModalHeader, // Removed (from heroui)
  // ModalBody, // Removed (from heroui)
  // ModalFooter, // Removed (from heroui)
  Button,
  Input,
  Checkbox,
} from "@heroui/react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast"; // Import toast
import { databases } from "~/utils/appwrite"; // Import appwrite utils

interface CalendarEvent {
  $id: string;
  name: string;
  dates: string[]; // Array of AD date strings ("YYYY/M/D" or "YYYY-MM-DD")
  holiday?: boolean;
  // Add other potential fields if necessary
}

interface EventsComponentProps {
  bsMonthName: string;
  calendarEvents: CalendarEvent[];
  onDataChange: () => void; // Function to trigger refetch in parent
}

// Database and Collection IDs (ensure these are accessible)
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_CALENDAR_COLLECTION_ID;

interface EditFormData {
  name: string;
  dateFromBs: string;
  dateToBs: string;
  isHoliday: boolean;
  isSingleDateEvent: boolean;
}

const Events: React.FC<EventsComponentProps> = ({
  bsMonthName,
  calendarEvents,
  onDataChange,
}) => {
  // --- State for Edit Drawer ---
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false); // Renamed for clarity
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: "",
    dateFromBs: "",
    dateToBs: "",
    isHoliday: false,
    isSingleDateEvent: false,
  });
  const [isEditLoading, setIsEditLoading] = useState(false);

  // --- State for Delete Popover ---
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // --- Helper Functions ---

  // Convert AD date string (YYYY/M/D or YYYY-MM-DD) to BS string (YYYY-MM-DD)
  const safeAdToBs = (adDate: string | undefined): string => {
    if (!adDate) return "";
    try {
      let formattedAdDate = adDate;
      if (adDate.includes("/")) {
        const parts = adDate.split("/");
        formattedAdDate = `${parts[0]}-${String(parts[1]).padStart(
          2,
          "0"
        )}-${String(parts[2]).padStart(2, "0")}`;
      }
      return adToBs(formattedAdDate);
    } catch (error) {
      console.error(`Error converting AD "${adDate}" to BS:`, error);
      toast.error(`Could not convert date ${adDate} to BS format.`);
      return "";
    }
  };

  // Convert BS date string (YYYY-MM-DD) to AD string (YYYY-MM-DD) required by converter
  const safeBsToAd = (bsDate: string): string | null => {
    if (!bsDate || !bsDate.trim()) return null;
    try {
      if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(bsDate)) {
        throw new Error("Invalid BS date format. Use YYYY-MM-DD.");
      }
      return bsToAd(bsDate);
    } catch (error: any) {
      console.error(`Error converting BS "${bsDate}" to AD:`, error);
      toast.error(
        error.message || `Invalid BS date: ${bsDate}. Use YYYY-MM-DD.`
      );
      return null;
    }
  };

  const formatBsDisplayDate = (bsDateStr: string): string => {
    if (!bsDateStr) return "Invalid Date";
    try {
      const [bsYear, bsMonth, bsDay] = bsDateStr.split("-");
      const nepaliMonthNamesShort = [
        "बैशाख", "जेठ", "असार", "श्रा", "भाद्र", "आश्विन",
        "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र",
      ];
      const monthIndex = parseInt(bsMonth) - 1;
      if (monthIndex < 0 || monthIndex >= nepaliMonthNamesShort.length) {
        return "Invalid Month";
      }
      const bsMonthNameShort = nepaliMonthNamesShort[monthIndex];
      return `${bsMonthNameShort} ${parseInt(bsDay)}, ${bsYear} BS`;
    } catch (error) {
      console.error("Error formatting BS display date:", bsDateStr, error);
      return "Format Error";
    }
  };

  // --- Edit Drawer Handlers ---
  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    const dateFromBs = safeAdToBs(event.dates?.[0]);
    const isSingle = event.dates?.length === 1 || !event.dates?.[1];
    const dateToBs = isSingle ? "" : safeAdToBs(event.dates?.[1]);

    setEditFormData({
      name: event.name || "",
      dateFromBs: dateFromBs,
      dateToBs: dateToBs,
      isHoliday: event.holiday || false,
      isSingleDateEvent: isSingle,
    });
    setIsEditDrawerOpen(true); // Open Drawer
  };

  const handleEditDrawerClose = () => {
    setIsEditDrawerOpen(false); // Close Drawer
    setEditingEvent(null);
  };

  const handleEditFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setEditFormData((prev) => ({ ...prev, [name]: checked }));
        if (name === "isSingleDateEvent" && checked) {
          setEditFormData((prev) => ({ ...prev, dateToBs: "" }));
        }
      } else {
        setEditFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    []
  );

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    setIsEditLoading(true);

    if (!editFormData.name.trim()) {
      toast.error("Event Name cannot be empty.");
      setIsEditLoading(false);
      return;
    }
    const dateFromAd = safeBsToAd(editFormData.dateFromBs);
    if (!dateFromAd) {
      setIsEditLoading(false);
      return;
    }

    let datesArray: string[];
    if (editFormData.isSingleDateEvent) {
      datesArray = [dateFromAd];
    } else {
      if (!editFormData.dateToBs.trim()) {
        toast.error("'Date To' is required for date range events.");
        setIsEditLoading(false);
        return;
      }
      const dateToAd = safeBsToAd(editFormData.dateToBs);
      if (!dateToAd) {
        setIsEditLoading(false);
        return;
      }
      if (new Date(dateFromAd) > new Date(dateToAd)) {
        toast.error("'Date From' cannot be after 'Date To'.");
        setIsEditLoading(false);
        return;
      }
      datesArray = [dateFromAd, dateToAd];
    }

    const dataPayload = {
      name: editFormData.name.trim(),
      dates: datesArray,
      holiday: editFormData.isHoliday,
    };

    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        editingEvent.$id,
        dataPayload
      );
      toast.success("Event updated successfully!");
      handleEditDrawerClose();
      onDataChange();
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(`Failed to update event: ${error.message}`);
    } finally {
      setIsEditLoading(false);
    }
  };

  // --- Delete Popover Handlers ---
  const handleDeleteClick = (eventId: string) => {
    setDeletingEventId(eventId);
    setIsDeletePopoverOpen(true);
  };

  const handleCloseDeletePopover = () => {
    setIsDeletePopoverOpen(false);
    setDeletingEventId(null);
    setIsDeleteLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEventId) return;
    setIsDeleteLoading(true);

    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        deletingEventId
      );
      toast.success("Event deleted successfully!");
      handleCloseDeletePopover();
      onDataChange();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error(`Failed to delete event: ${error.message}`);
      setIsDeleteLoading(false);
    }
  };

  // --- Render Logic ---
  if (!calendarEvents || calendarEvents.length === 0) {
    return (
      <div className="p-6 rounded-md flex flex-col h-full text-gray-600 text-center items-center justify-center">
        No events listed for {bsMonthName}.
      </div>
    );
  }

  return (
    <>
      <div className="px-4 sm:px-6 pt-3 rounded-md flex flex-col h-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 border-b-2 pb-2">
          Events in {bsMonthName}
        </h2>
        <div className="flex flex-col gap-4 sm:gap-6 overflow-y-auto flex-grow">
          {calendarEvents.map((event, index) => {
            const startDateAd = event.dates?.[0];
            const endDateAd = event.dates?.length > 1 ? event.dates[1] : startDateAd;
            const eventName = event.name;
            const formattedStartDateBs = formatBsDisplayDate(safeAdToBs(startDateAd));
            const formattedEndDateBs = formatBsDisplayDate(safeAdToBs(endDateAd));
            const dateRangeBs =
              formattedStartDateBs === formattedEndDateBs || !event.dates?.[1]
                ? formattedStartDateBs
                : `${formattedStartDateBs} - ${formattedEndDateBs}`;

            return (
              <div key={event.$id} className="relative group">
                <div className="flex justify-between items-start gap-2">
                  <strong className="block font-medium text-gray-800 mb-1 text-lg flex-grow">
                    {eventName}{" "}
                    {event.holiday && (
                      <span className="text-xs text-red-600 font-normal ml-1">
                        (Holiday)
                      </span>
                    )}
                  </strong>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Tooltip
                      content="Edit"
                      showArrow
                      color="warning"
                      placement="top"
                      className="bg-warning-500 text-white rounded-md shadow-md"
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="warning"
                        onPress={() => handleEditClick(event)}
                        aria-label="Edit Event"
                      >
                        <PencilIcon className="h-4 w-4 text-orange-500" />
                      </Button>
                    </Tooltip>
                    <Tooltip
                      content="Delete"
                      showArrow
                      color="danger"
                      placement="top"
                      className="bg-danger-500 text-white rounded-md shadow-md"
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleDeleteClick(event.$id)}
                        aria-label="Delete Event"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <ul className="pl-0 space-y-1">
                  <li className="text-gray-700 text-sm sm:text-base">
                    Date (BS): {dateRangeBs}
                  </li>
                </ul>
                {index < calendarEvents.length - 1 && (
                  <hr className="my-4 sm:my-6 border-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Edit Event Drawer --- */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={handleEditDrawerClose}
        // position="right" // Default is 'right'
        // size="md" // Default is 'md'
      >
        <Drawer.Header>
          <h1 className="text-xl font-semibold">Edit Event</h1>
        </Drawer.Header>
        <Drawer.Body>
          {/* Drawer.Body has p-4 by default, which covers the previous px-4 on inner div and py-4 on ModalBody */}
          <div className="flex flex-col gap-3">
            <Input
              isRequired
              type="text"
              label="Name"
              name="name"
              value={editFormData.name}
              onChange={handleEditFormChange}
              className="font-medium"
              variant="underlined"
              color="secondary"
            />
            <Input
              isRequired
              type="text"
              label="Date From (BS YYYY-MM-DD)"
              name="dateFromBs"
              value={editFormData.dateFromBs}
              onChange={handleEditFormChange}
              className="font-medium"
              variant="underlined"
              color="secondary"
            />
            {!editFormData.isSingleDateEvent && (
              <Input
                isRequired
                type="text"
                label="Date To (BS YYYY-MM-DD)"
                name="dateToBs"
                value={editFormData.dateToBs}
                onChange={handleEditFormChange}
                className="font-medium"
                variant="underlined"
                color="secondary"
              />
            )}
            <div className="flex flex-col sm:flex-row gap-4 ">
              <Checkbox
                name="isHoliday"
                isSelected={editFormData.isHoliday}
                onChange={handleEditFormChange}
              >
                Holiday
              </Checkbox>
              <Checkbox
                name="isSingleDateEvent"
                isSelected={editFormData.isSingleDateEvent}
                onChange={handleEditFormChange}
              >
                Single Day Event
              </Checkbox>
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer className="px-10 mb-1"> {/* Retaining original ModalFooter classes for similar styling */}
          <Button
            color="default"
            variant="light"
            onPress={handleEditDrawerClose} // Use the main close handler
            disabled={isEditLoading}
          >
            Cancel
          </Button>
          <Button
            color="success"
            className="text-white font-medium"
            onPress={handleUpdateEvent}
            isLoading={isEditLoading}
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer>

      {/* --- Delete Confirmation Popover --- */}
      <Popover
        isOpen={isDeletePopoverOpen}
        onClose={handleCloseDeletePopover}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        content="Are you sure you want to permanently delete this event? This action cannot be undone."
        isConfirmLoading={isDeleteLoading}
      />
    </>
  );
};

export default Events;