// src/components/Calendar/Events.tsx
import React, { useState, useCallback } from "react";
import { adToBs, bsToAd } from "@sbmdkl/nepali-date-converter";
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

const Events: React.FC<EventsComponentProps> = ({
  bsMonthName,
  calendarEvents,
  onDataChange,
}) => {
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
    </>
  );
};

export default Events;
