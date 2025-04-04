// src/Section/Section.tsx
import React, { useState, useEffect } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import List from "./Section/List";
import Details from "./Section/Details";
import { useSectionStore } from "~/store/sectionStore";
import { Section as SectionType } from "types"; // Import interface from types/index.ts

const Section = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(
    null
  );
  const [showDetailsMobile, setShowDetailsMobile] = useState<boolean>(false);

  const { sectionData, fetchSectionData, isLoading } = useSectionStore();

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleSectionSelect = (section: SectionType | null) => {
    setSelectedSection(section);
    if (isMobile) {
      if (section) {
        setShowDetailsMobile(true);
      } else {
        setShowDetailsMobile(false);
      }
    } else {
      setShowDetailsMobile(false);
    }
  };

  const handleBackToList = () => {
    setShowDetailsMobile(false);
    setSelectedSection(null);
  };

  return (
    <div className="flex flex-1 w-full h-full ">
      {isMobile ? (
        !showDetailsMobile ? (
          <div className="flex-1 bg-gray-100 rounded-xl  overflow-hidden">
            <List
              isMobile={isMobile}
              onSectionSelect={handleSectionSelect}
              sectionData={sectionData}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <Details section={selectedSection} onBack={handleBackToList} />
            </PerfectScrollbar>
          </div>
        )
      ) : (
        <div className="flex w-full gap-3">
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              <List
                isMobile={isMobile}
                onSectionSelect={handleSectionSelect}
                sectionData={sectionData}
                isLoading={isLoading}
              />
            </PerfectScrollbar>
          </div>
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <PerfectScrollbar options={{ suppressScrollX: true }}>
              {selectedSection ? (
                <Details section={selectedSection} />
              ) : (
                <div className="p-6 rounded-md flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600 text-lg italic">
                    Select a section to view details.
                  </p>
                </div>
              )}
            </PerfectScrollbar>
          </div>
        </div>
      )}
    </div>
  );
};

export default Section;
