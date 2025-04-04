// src/components/Calendar/Events.tsx
import React, { useState, useCallback } from "react";
import { adToBs, bsToAd } from "@sbmdkl/nepali-date-converter";
import Popover from "../common/Popover"; // Adjust path if necessary
import {
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Checkbox,
} from "@heroui/react";
import { TrashIcon, PencilIcon } from "@heroicons/react/24/solid";
// import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline"; // Using outline icons
import toast from "react-hot-toast"; // Import toast
import { databases, ID } from "~/utils/appwrite"; // Import appwrite utils

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
  // --- State for Edit Modal ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
      // The converter might expect YYYY-MM-DD, ensure format if needed
      // If your adDate is YYYY/M/D, you might need to convert it first
      // Example rough conversion (needs robust handling):
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
      return ""; // Return empty or indicate error
    }
  };

  // Convert BS date string (YYYY-MM-DD) to AD string (YYYY-MM-DD) required by converter
  const safeBsToAd = (bsDate: string): string | null => {
    if (!bsDate || !bsDate.trim()) return null;
    try {
      if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(bsDate)) {
        throw new Error("Invalid BS date format. Use YYYY-MM-DD.");
      }
      // bsToAd returns "YYYY-MM-DD" which is fine for Appwrite string array
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
      // Assuming bsDateStr is YYYY-MM-DD from adToBs
      const [bsYear, bsMonth, bsDay] = bsDateStr.split("-");
      const nepaliMonthNamesShort = [
        "बैशाख",
        "जेठ",
        "असार",
        "श्रा",
        "भाद्र",
        "आश्विन",
        "कार्तिक",
        "मंसिर",
        "पौष",
        "माघ",
        "फाल्गुन",
        "चैत्र",
      ];
      // Check if month index is valid
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

  // --- Edit Modal Handlers ---
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
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null); // Clear editing state
    // Optional: Reset form data? Usually done on open or save.
  };

  const handleEditFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setEditFormData((prev) => ({ ...prev, [name]: checked }));
        // If switching to single day, clear dateToBs
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

    // --- Validation ---
    if (!editFormData.name.trim()) {
      toast.error("Event Name cannot be empty.");
      setIsEditLoading(false);
      return;
    }
    const dateFromAd = safeBsToAd(editFormData.dateFromBs);
    if (!dateFromAd) {
      // safeBsToAd shows toast on error
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
        // safeBsToAd shows toast on error
        setIsEditLoading(false);
        return;
      }
      // Optional date order check
      if (new Date(dateFromAd) > new Date(dateToAd)) {
        toast.error("'Date From' cannot be after 'Date To'.");
        setIsEditLoading(false);
        return;
      }
      datesArray = [dateFromAd, dateToAd];
    }

    // --- Prepare Payload ---
    const dataPayload = {
      name: editFormData.name.trim(),
      dates: datesArray,
      holiday: editFormData.isHoliday,
    };

    // console.log(
    //   "Updating event:",
    //   editingEvent.$id,
    //   "with payload:",
    //   dataPayload
    // );

    // --- Appwrite Update ---
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        editingEvent.$id,
        dataPayload
      );
      toast.success("Event updated successfully!");
      handleEditModalClose();
      onDataChange(); // Trigger refetch
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
    setIsDeleteLoading(false); // Ensure loading state is reset
  };

  const handleConfirmDelete = async () => {
    if (!deletingEventId) return;

    setIsDeleteLoading(true);
    // conso    le.log("Attempting to delete event:", deletingEventId);

    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        deletingEventId
      );
      toast.success("Event deleted successfully!");
      handleCloseDeletePopover();
      onDataChange(); // Trigger refetch
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error(`Failed to delete event: ${error.message}`);
      setIsDeleteLoading(false); // Keep popover open on error? Or close? User choice.
      // handleCloseDeletePopover(); // Optionally close even on error
    }
    // No finally needed here as loading state is reset in onClose or on success/error paths
  };

  // --- Render Logic ---
  if (!calendarEvents || calendarEvents.length === 0) {
    return (
      <div className="p-6 rounded-md flex flex-col h-full text-gray-600 text-center items-center justify-center">
        {/* You can add an icon here if you like */}
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
          {" "}
          {/* Allow list to scroll */}
          {calendarEvents.map((event, index) => {
            const startDateAd = event.dates?.[0];
            const endDateAd =
              event.dates?.length > 1 ? event.dates[1] : startDateAd; // Use start date if only one date
            const eventName = event.name;

            // Use safeAdToBs for conversion before formatting display date
            const formattedStartDateBs = formatBsDisplayDate(
              safeAdToBs(startDateAd)
            );
            const formattedEndDateBs = formatBsDisplayDate(
              safeAdToBs(endDateAd)
            );

            const dateRangeBs =
              formattedStartDateBs === formattedEndDateBs || !event.dates?.[1]
                ? formattedStartDateBs
                : `${formattedStartDateBs} - ${formattedEndDateBs}`;

            return (
              <div key={event.$id} className="relative group">
                {" "}
                {/* Added relative and group for absolute positioning */}
                <div className="flex justify-between items-start gap-2">
                  {" "}
                  {/* Flex container for name and icons */}
                  <strong className="block font-medium text-gray-800 mb-1 text-lg flex-grow">
                    {" "}
                    {/* Allow name to grow */}
                    {eventName}{" "}
                    {event.holiday && (
                      <span className="text-xs text-red-600 font-normal ml-1">
                        (Holiday)
                      </span>
                    )}
                  </strong>
                  {/* Action Icons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* <Tooltip
                      content="Edit Event"
                      placement="top"
                      showArrow
                      color="warning"
                      className=" text-white"
                    >
                      <button
                        onClick={() => handleEditClick(event)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-100"
                        aria-label="Edit event"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                    </Tooltip>
                    <Tooltip
                      content="Delete Event"
                      placement="top"
                      showArrow
                      color="danger"
                    >
                      <button
                        onClick={() => handleDeleteClick(event.$id)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-100"
                        aria-label="Delete event"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </Tooltip> */}

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
                          aria-label="Edit Faculty"
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
                          aria-label="Delete Faculty"
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
                  {/* You could add AD dates here too if needed */}
                  {/* <li className="text-gray-500 text-xs sm:text-sm">
                                         Date (AD): {startDateAd} {event.dates?.[1] && startDateAd !== endDateAd ? ` - ${endDateAd}` : ''}
                                     </li> */}
                </ul>
                {index < calendarEvents.length - 1 && (
                  <hr className="my-4 sm:my-6 border-gray-200" /> // Lighter border
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Edit Event Modal --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        backdrop="blur"
      >
        <ModalContent>
          {(
            onClose // Use the onClose provided by ModalContent
          ) => (
            <>
              <ModalBody className=" py-4">
                <div className="flex flex-col gap-3 px-4">
                  <h1 className=" text-xl font-semibold mt-2 ">
                    Edit Event
                  </h1>
                  {/* Reusing form structure from Controls.tsx */}
                  <Input
                    isRequired
                    type="text"
                    label="Name"
                    name="name" // Add name attribute for handler
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    className="font-medium"
                    variant="underlined"
                    color="secondary"
                    // placeholder="Event Name"
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
                    //  placeholder="YYYY-MM-DD"
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
                    //   placeholder="YYYY-MM-DD"
                    />
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 ">
                    <Checkbox
                      name="isHoliday"
                      isSelected={editFormData.isHoliday}
                      onChange={handleEditFormChange} // Use generic handler
                    >
                      Holiday
                    </Checkbox>
                    <Checkbox
                      name="isSingleDateEvent"
                      isSelected={editFormData.isSingleDateEvent}
                      onChange={handleEditFormChange} // Use generic handler
                    >
                      Single Day Event
                    </Checkbox>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className=" px-10 mb-1">
                <Button
                  color="default"
                  variant="light"
                  onPress={onClose}
                  disabled={isEditLoading}
                >
                  Cancel
                </Button>
                <Button
                  color="success"
                className=" text-white font-medium"
                  onPress={handleUpdateEvent}
                  isLoading={isEditLoading}
                >
                  Save 
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

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
