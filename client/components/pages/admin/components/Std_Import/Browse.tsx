// ~/Std_Import/Browse.tsx
import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import * as Papa from "papaparse";
import { Button, Input } from "@heroui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import ErrorMessage from "../common/ErrorMessage";
import toast, { Toaster } from "react-hot-toast";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@heroui/react";
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css"; // Keep PerfectScrollbar CSS for base functionality
import "./Browse.css"; // Import component-specific CSS or use global CSS

interface BrowseProps {
  onFileSelect: (
    file: File | null,
    parsedData: any[] | null,
    fileHeaders: string[] | null
  ) => void;
  fileDataPreview: any[] | null; // Ensure this is an array of arrays, or null
  fileHeaders: string[] | null;
  onReset: () => void;
  onNext: () => void;
  showDataPreview: boolean;
  fileName: string | null;
  isMobile: boolean;
}

const Browse: React.FC<BrowseProps> = ({
  onFileSelect,
  fileDataPreview,
  fileHeaders,
  onReset,
  onNext,
  showDataPreview,
  fileName: propFileName,
  isMobile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(
    propFileName
  );
  const [displayedRowsCount, setDisplayedRowsCount] = useState<number>(10); // Initial number of rows to display

  useEffect(() => {
    setLocalFileName(propFileName);
    setDisplayedRowsCount(10); // Reset displayed rows on file name change
  }, [propFileName]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError(null);
    setLocalFileName(null);
    onReset();
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setLocalFileName(file.name);

    try {
      let parsedData: any[] | null = null;
      let headers: string[] = [];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "xlsx" || fileExtension === "xls") {
        const excelResult = await parseExcelFile(file);
        parsedData = excelResult.data;
        headers = excelResult.headers;
      } else if (fileExtension === "csv") {
        const csvResult = await parseCsvFile(file);
        parsedData = csvResult.data;
        headers = csvResult.headers;
      } else {
        setError(
          "Unsupported file format. Please upload XLSX, XLS, or CSV files."
        );
        setLoading(false);
        return;
      }

      if (parsedData && headers) {
        onFileSelect(file, parsedData, headers);
      } else {
        setError("Failed to parse file data.");
        onFileSelect(null, null, null);
      }
    } catch (e: any) {
      console.error("File parsing error:", e);
      setError(`Error parsing file: ${e.message}`);
      onFileSelect(null, null, null);
    } finally {
      setLoading(false);
    }
  };

  const parseExcelFile = (
    file: File
  ): Promise<{ data: any[]; headers: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headers = (jsonData[0] as string[]) || [];
          const dataRows = jsonData.slice(1);
          resolve({ data: dataRows, headers });
        } catch (e) {
          reject(e);
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file."));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const parseCsvFile = (
    file: File
  ): Promise<{ data: any[]; headers: string[] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(results.errors.map((e) => e.message).join(", ")));
          } else {
            const parsedData = results.data as any[][];
            const headers = (parsedData[0] as string[]) || [];
            const dataRows = parsedData.slice(1);
            resolve({ data: dataRows, headers });
          }
        },
        error: (error: any) => {
          reject(new Error(error.message));
        },
      });
    });
  };

  const handleCancelFile = () => {
    setLocalFileName(null);
    onReset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLoadMore = () => {
    if (fileDataPreview) {
      // Check if fileDataPreview is not null
      setDisplayedRowsCount((prevCount) => prevCount + 10);
    }
  };

  return (
    <div className="p-6 rounded-md flex flex-col h-full">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse File</h2>
      {error && <ErrorMessage message={error} />}

      {!localFileName && !loading ? (
        // css from external file also
        <div className="file-upload flex flex-col items-center justify-center h-full text-center">
          <DocumentPlusIcon className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500 text-sm italic mb-4">
            Select a XLSX, XLS, or CSV file to import student data.
          </p>
          <Button
            color="secondary"
            onPress={() => fileInputRef.current?.click()}
          >
            Browse Files
          </Button>
          <Input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
            isDisabled={loading}
          />
        </div>
      ) : (
        <>
          {localFileName && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="mr-2">File:</span>
                <span className="font-semibold">{localFileName}</span>
              </div>
              <Button
                size="md"
                variant="shadow"
                color="danger"
                onPress={handleCancelFile}
                isDisabled={loading}
                className=" -translate-y-[1.8rem] mr-3 font-medium"
              >
                Reset
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex justify-center mb-4">
              <Spinner label="Parsing File..." size="md" />
            </div>
          )}

          {showDataPreview &&
            fileDataPreview &&
            fileDataPreview.length > 0 &&
            fileHeaders &&
            fileHeaders.length > 0 && (
              <div
                className="mb-4 relative scrollable-table-container"
                style={{ maxHeight: "300px", overflowY: "auto" }}
              >
                {" "}
                {/* Apply maxHeight and overflow to container */}
                <PerfectScrollbar style={{ overflowX: "auto" }}>
                  {" "}
                  {/* Keep PerfectScrollbar for horizontal scroll and smooth scrolling */}
                  <table className="min-w-full leading-normal shadow-md rounded-lg overflow-hidden">
                    <thead className="bg-gray-50  top-0 z-10">
                      {" "}
                      {/* Sticky header */}
                      <tr>
                        {fileHeaders.map((header: any, index: number) => (
                          <th
                            key={index}
                            className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileDataPreview
                        .slice(0, displayedRowsCount)
                        .map((row: any[], rowIndex: number) => (
                          <tr key={rowIndex} className="hover:bg-gray-100">
                            {row.map((cell: any, cellIndex: number) => (
                              <td
                                key={cellIndex}
                                className="px-5 py-3 border-b border-gray-200 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                              >
                                {cell !== null && cell !== undefined
                                  ? cell.toString()
                                  : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </PerfectScrollbar>
              </div>
            )}

         
<div className="flex flex-wrap justify-center gap-x-20 pt-8 mt-2">
  {fileDataPreview && displayedRowsCount < fileDataPreview.length && (
    <Button color="default" onPress={handleLoadMore}>
      Load More
    </Button>
  )}
  {showDataPreview &&
    localFileName &&
    !loading &&
    fileDataPreview &&
    fileDataPreview.length > 0 &&
    fileHeaders &&
    fileHeaders.length > 0 &&
    isMobile && (
      <Button color="primary" variant="shadow" className="font-medium" onPress={onNext}>
        Next
      </Button>
    )}
</div>

          

        
        </>
      )}
    </div>
  );
};

export default Browse;