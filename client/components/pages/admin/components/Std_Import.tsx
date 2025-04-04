// ~/Std_Import/Std_Import.tsx
import React, { useState, useEffect } from "react";
import Browse from "./Std_Import/Browse";
import Customize from "./Std_Import/Customize";
import { Student as StudentType } from "~/store/studentStore"; // Import Student interface

const Std_Import = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<any[] | null>(null);
  const [showCustomize, setShowCustomize] = useState<boolean>(false);
  const [fileHeaders, setFileHeaders] = useState<string[] | null>(null);
  const [showBrowseData, setShowBrowseData] = useState<boolean>(false);

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

  const handleFileSelect = (file: File | null, parsedData: any[] | null, headers: string[] | null) => {
    setSelectedFile(file);
    setFileData(parsedData);
    setFileHeaders(headers);
    setShowBrowseData(true);
    if (!isMobile && file && parsedData && headers) {
      setShowCustomize(true);
    } else {
      setShowCustomize(false);
    }
  };

  const handleCustomizeNavigation = () => {
    if (fileData && fileHeaders) {
      setShowCustomize(true);
      setShowBrowseData(false);
    }
  };

  const handleBackToBrowse = () => {
    setShowCustomize(false);
    setShowBrowseData(true);
  };

  const handleBrowseReset = () => {
    setShowBrowseData(false);
    setShowCustomize(false);
    setSelectedFile(null);
    setFileData(null);
    setFileHeaders(null);
  };

  return (
    <div className="flex flex-1 w-full h-full ">
      {isMobile ? (
        !showCustomize ? (
          <div className="flex-1 bg-gray-100 rounded-xl  overflow-hidden">
            <Browse
              onFileSelect={handleFileSelect}
              fileDataPreview={showBrowseData ? fileData : null}
              fileHeaders={showBrowseData ? fileHeaders : null}
              onReset={handleBrowseReset}
              onNext={handleCustomizeNavigation}
              showDataPreview={showBrowseData}
              fileName={selectedFile?.name || null}
              isMobile={isMobile} // Pass isMobile prop
            />
          </div>
        ) : (
          <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden">
            {fileData && fileHeaders && (
              <Customize
                fileData={fileData}
                fileHeaders={fileHeaders}
                onBack={handleBackToBrowse}
                selectedFile={selectedFile}
                isMobile={isMobile}
              />
            )}
          </div>
        )
      ) : (
        <div className="flex w-full gap-3">
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            <Browse
              onFileSelect={handleFileSelect}
              fileDataPreview={fileData}
              fileHeaders={fileHeaders}
              onReset={handleBrowseReset}
              onNext={handleCustomizeNavigation}
              showDataPreview={true}
              fileName={selectedFile?.name || null}
              isMobile={isMobile} // Pass isMobile prop
            />
          </div>
          <div className="flex-1 bg-gray-100 rounded-xl shadow-md overflow-hidden">
            {showCustomize && fileData && fileHeaders ? (
              <Customize
                fileData={fileData}
                selectedFile={selectedFile}
                fileHeaders={fileHeaders}
                isMobile={isMobile}
              />
            ) : (
              <div className="p-6 rounded-md flex flex-col items-center justify-center h-full">
                <p className="text-gray-600 text-lg italic">
                  Browse and select a file to import student data.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Std_Import;