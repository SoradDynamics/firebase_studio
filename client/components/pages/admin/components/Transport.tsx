// src/Transport.tsx
import React, { useState, useEffect } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import List from "./Transport/List"; // Import List from Transport folder
import Details from "./Transport/Details"; // Import Details from Transport folder
import { useTransportStore } from "~/store/transportStore"; // Import the new store
import { Driver } from 'types'; // Import Driver type

const Transport = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null); // State for selected driver
  const [showDetailsMobile, setShowDetailsMobile] = useState<boolean>(false); // State for mobile details visibility

  // Use the transport store
  const { driverData, fetchDriversData, isLoading, isTransportLoading } = useTransportStore(); // Get data/funcs/loading state

  // Fetch initial data when the component mounts
  useEffect(() => {
    fetchDriversData();
  }, [fetchDriversData]); // Dependency array includes fetch function from store

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Handler for when a driver is selected in the List/Table
  const handleDriverSelect = (driver: Driver | null) => {
    setSelectedDriver(driver);
    if (isMobile) {
      setShowDetailsMobile(!!driver); // Show details if a driver is selected, hide if null
    } else {
       setShowDetailsMobile(false); // Not used in desktop view this way
    }
  };

  // Handler for the "Back to List" button in mobile Details view
  const handleBackToList = () => {
    setShowDetailsMobile(false); // Hide details view
    setSelectedDriver(null); // Clear selected driver state
    // List component will handle clearing table selection via its own callback
  };

  return (
    <div className="flex flex-1 w-full h-full ">
      {/* Mobile View */}
      {isMobile ? (
        !showDetailsMobile ? (
          // Mobile List View
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            {/* Pass driver data, loading state, and selection handler */}
            <List
              isMobile={isMobile}
              onDriverSelect={handleDriverSelect}
              driverData={driverData}
              isLoading={isTransportLoading} // Pass the specific loading state
            />
          </div>
        ) : (
          // Mobile Details View
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {/* Pass selected driver and back handler */}
              <Details driver={selectedDriver} onBack={handleBackToList} />
            </PerfectScrollbar>
          </div>
        )
      ) : (
        /* Desktop View (Side-by-Side) */
        <div className="flex w-full gap-3">
          {/* Desktop List View */}
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {/* Pass driver data, loading state, and selection handler */}
              <List
                isMobile={isMobile}
                onDriverSelect={handleDriverSelect}
                driverData={driverData}
                isLoading={isTransportLoading} // Pass the specific loading state
               />
            </PerfectScrollbar>
          </div>
          {/* Desktop Details View */}
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {/* Conditionally render Details or placeholder */}
              {selectedDriver ? (
                <Details driver={selectedDriver} />
              ) : (
                <div className="p-6 rounded-md flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600 text-lg italic">Select a driver to view details.</p>
                </div>
              )}
            </PerfectScrollbar>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transport;