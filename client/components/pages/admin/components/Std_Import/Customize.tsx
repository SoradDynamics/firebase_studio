// ~/Std_Import/Customize.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress, // Import Progress indicator
} from "@heroui/react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { LeftArrowIcon } from "components/icons"; // Assuming path is correct
import ErrorMessage from "../common/ErrorMessage"; // Assuming path is correct
import toast, { Toaster } from "react-hot-toast";
import { useFacultyStore } from "~/store/facultyStore"; // Assuming path is correct
import { useSectionStore } from "~/store/sectionStore"; // Assuming path is correct
import { useParentStore } from "~/store/parentStore"; // Assuming path is correct
import { useStudentStore } from "~/store/studentStore"; // Assuming path is correct
import { Faculty, Section, Parent } from "types"; // Assuming path is correct

// --- Server URL ---
const SERVER_URL = import.meta.env.VITE_SERVER_URL; // Ensure this is defined in your .env

interface ProcessedRowData {
  studentData: {
    name: string;
    class: string;
    facultyId: string; // This is the Faculty Document ID ($id)
    section: string;
    // Add other student fields derived from validation if needed
  };
  parentInfo: {
    name: string;
    email: string;
    contact: string[];
    existingParentId?: string; // Parent Document ID ($id) if found during validation
  };
  rowNumber: number; // Original file row number (for reporting)
}

interface CustomizeProps {
  fileData: any[];
  selectedFile: File | null;
  onBack?: () => void;
  isMobile: boolean;
  fileHeaders: string[] | null;
}

const Customize: React.FC<CustomizeProps> = ({
  fileData,
  selectedFile,
  onBack,
  isMobile,
  fileHeaders,
}) => {
  // --- State ---
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<{
    [header: string]: string;
  }>({});
  const [processedData, setProcessedData] = useState<ProcessedRowData[]>([]); // Store validated data structure
  const [
    validationErrors,
    setValidationErrors,
  ] = useState<{ row: number; errors: string[] }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false); // For validation phase
  const [processResultModalOpen, setProcessResultModalOpen] = useState(false);
  const [processSuccessCount, setProcessSuccessCount] = useState(0);
  const [processErrorCount, setProcessErrorCount] = useState(0);
  const [duplicateMappingError, setDuplicateMappingError] =
    useState<string | null>(null);

  // --- Import Specific State ---
  const [isImporting, setIsImporting] = useState(false); // For saving phase
  const [importProgressModalOpen, setImportProgressModalOpen] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);
  const [importErrors, setImportErrors] = useState<{ rowNumber: number; message: string }[]>([]);

  // --- Zustand Store Hooks ---
  const { facultyData, fetchFacultyData } = useFacultyStore();
  const { sectionData, fetchSectionData } = useSectionStore();
  const { parentData, fetchParentData, addParentData, updateParentData } = useParentStore();
  const { addStudentData } = useStudentStore(); // No need for studentData or fetch here directly

  // --- Effects ---
  // Fetch required data on component mount
  useEffect(() => {
    Promise.all([fetchFacultyData(), fetchSectionData(), fetchParentData()]);
  }, [fetchFacultyData, fetchSectionData, fetchParentData]);

  // Initialize state when fileHeaders change
  useEffect(() => {
    if (fileHeaders) {
      setHeaders(fileHeaders);
      const initialMappings: { [header: string]: string } = {};
      fileHeaders.forEach((header: any) => {
        const headerString = header?.toString() ?? "";
        const headerLower = headerString.toLowerCase();
        if (headerLower.includes("student") || headerLower.includes("student name")) initialMappings[headerString] = "stdName";
        else if (headerLower.includes("class")) initialMappings[headerString] = "class";
        else if (headerLower.includes("section")) initialMappings[headerString] = "section";
        else if (headerLower.includes("faculty")) initialMappings[headerString] = "facultyId";
        else if (headerLower.includes("parent email") || headerLower.includes("email")) initialMappings[headerString] = "parentEmail";
        else if (headerLower.includes("parent name") || headerLower.includes("father name") || headerLower.includes("mother name")) initialMappings[headerString] = "parentName";
        else if (headerLower.includes("contact") || headerLower.includes("phone")) initialMappings[headerString] = "parentContact";
        else initialMappings[headerString] = "";
      });
      setColumnMappings(initialMappings);
      setDuplicateMappingError(null);
      setValidationErrors([]);
      setProcessedData([]);
      setProcessResultModalOpen(false);
      setImportProgressModalOpen(false); // Reset import modal too
      setIsImporting(false); // Ensure importing state is reset
    }
  }, [fileHeaders]);

  // --- Field Options Memo ---
  const fieldOptions = useMemo(
    () => [
        { value: "", label: "--- Select Field ---" },
        { value: "stdName", label: "Student Name" },
        { value: "class", label: "Class" },
        { value: "section", label: "Section" },
        { value: "facultyId", label: "Faculty" },
        { value: "parentName", label: "Parent Name" },
        { value: "parentEmail", label: "Parent Email" },
        { value: "parentContact", label: "Parent Contact" },
        { value: "ignore", label: "Ignore" },
      ],
      []
  );

  // --- Event Handlers ---
  // Handle mapping changes and check duplicates
  const handleColumnMappingChange = (header: string, field: string) => {
    setColumnMappings((prevMappings) => {
      const updatedMappings = { ...prevMappings, [header]: field };
      const reversedMappings: { [field: string]: string[] } = {};
      for (const head in updatedMappings) {
        const mappedField = updatedMappings[head];
        if (mappedField && mappedField !== "" && mappedField !== "ignore") {
          reversedMappings[mappedField] = reversedMappings[mappedField] || [];
          reversedMappings[mappedField].push(head);
        }
      }
      let duplicateError = null;
      for (const fieldKey in reversedMappings) {
        const fieldLabel = fieldOptions.find(opt => opt.value === fieldKey)?.label || fieldKey;
        if (reversedMappings[fieldKey].length > 1 && fieldKey !== "ignore") {
          duplicateError = `Field "${fieldLabel}" is mapped to multiple columns: ${reversedMappings[fieldKey].join(", ")}. Please ensure each field is mapped only once or set to 'Ignore'.`;
          break;
        }
      }
      setDuplicateMappingError(duplicateError);
      return updatedMappings;
    });
  };

  // Validate data from the file based on mappings
  const processAndValidateData = async () => {
    // (Validation logic remains the same as the previous correct version)
    // ... ensures setProcessedData contains valid rows like { studentData, parentInfo, rowNumber } ...

    setValidationErrors([]);
    let validatedRows: ProcessedRowData[] = []; // Use the defined interface
    setIsProcessing(true);
    setProcessErrorCount(0);
    setProcessSuccessCount(0);

    if (duplicateMappingError) {
      setIsProcessing(false);
      toast.error("Cannot process data due to duplicate column mappings.");
      return;
    }

    const facultyMapByName = new Map(facultyData.map(f => [f.name.toLowerCase(), f]));
    const sectionMapKey = (facultyId: string, className: string, sectionName: string) =>
        `${facultyId}-${className}-${sectionName.toLowerCase()}`;
    const validSectionData = sectionData.filter((s): s is Section & { facultyId: string; class: string; name: string } =>
        typeof s.facultyId === 'string' && s.facultyId.trim() !== '' &&
        typeof s.class === 'string' && s.class.trim() !== '' &&
        typeof s.name === 'string' && s.name.trim() !== ''
    );
    const sectionSet = new Set(validSectionData.map(s => sectionMapKey(s.facultyId, s.class, s.name)));

    let rowValidationErrors: { row: number; errors: string[] }[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let rowIndex = 0; rowIndex < fileData.length; rowIndex++) {
      const rowData = fileData[rowIndex];
      const reportFileRowNumber = rowIndex + 2;

      if (!rowData || rowData.every((cell: any) => cell === null || cell === undefined || cell === "")) {
        continue;
      }

      let studentDataForRow: any = { section: "" };
      let parentInfoForRow: any = { contact: [] };
      let errors: string[] = [];
      let facultyName: string | null = null;
      let className: string | null = null;
      let sectionName: string | null = null;
      let foundFaculty: Faculty | null = null;

      let studentNameContext = `File Row ${reportFileRowNumber} Student`;
      const nameHeader = Object.keys(columnMappings).find(key => columnMappings[key] === 'stdName');
      const nameIndex = nameHeader ? headers.indexOf(nameHeader) : -1;
      if (nameIndex !== -1 && rowData[nameIndex] != null && rowData[nameIndex] !== '') {
          studentNameContext = rowData[nameIndex].toString();
      }

      // Pass 1: Extract and basic required checks
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = headers[colIndex];
        const mappedField = columnMappings[header];
        const cellValue = rowData[colIndex];

        if (mappedField && mappedField !== "ignore") {
          const isEmpty = cellValue === null || cellValue === undefined || cellValue === "";
          const fieldLabel = fieldOptions.find(opt => opt.value === mappedField)?.label || mappedField;

          if (isEmpty) {
            if (["stdName", "class", "facultyId", "parentName", "parentEmail", "parentContact"].includes(mappedField)) {
              errors.push(`${fieldLabel} is required.`);
            }
          } else {
            try {
              const valueString = cellValue.toString();
              if (mappedField === "stdName") studentDataForRow.name = valueString;
              else if (mappedField === "class") { studentDataForRow.class = valueString; className = valueString; }
              else if (mappedField === "section") { studentDataForRow.section = valueString; sectionName = valueString; }
              else if (mappedField === "facultyId") { facultyName = valueString; }
              else if (mappedField === "parentName") parentInfoForRow.name = valueString;
              else if (mappedField === "parentEmail") {
                if (!/\S+@\S+\.\S+/.test(valueString)) errors.push(`Invalid ${fieldLabel} format: "${valueString}".`);
                parentInfoForRow.email = valueString;
              } else if (mappedField === "parentContact") {
                const contacts = valueString.split(",").map((c: string) => c.trim()).filter((c: string) => c !== "");
                if (contacts.length === 0) errors.push(`${fieldLabel} column mapped but no valid numbers.`);
                parentInfoForRow.contact = contacts;
              }
            } catch (e: any) { errors.push(`Error processing field "${fieldLabel}": ${e.message}`); }
          }
        }
      }

      // Pass 2: Cross-column validation
      if (facultyName && className && !errors.some(e => e.includes('Faculty is required') || e.includes('Class is required'))) {
        const faculty = facultyMapByName.get(facultyName.toLowerCase());
        if (!faculty) { errors.push(`Faculty "${facultyName}" not found.`); }
        else {
          foundFaculty = faculty;
          studentDataForRow.facultyId = faculty.$id; // Assign the actual faculty document ID

          const classExists = faculty.classes?.some(fc => fc.toString() === className);
          if (!classExists) { errors.push(`Class "${className}" not associated with Faculty "${facultyName}".`); }
          else if (sectionName) {
            const key = sectionMapKey(faculty.$id, className, sectionName);
            if (!sectionSet.has(key)) { errors.push(`Section "${sectionName}" not found for Class "${className}" in Faculty "${facultyName}".`); }
          }
        }
      }

      // Check for existing parent based on email (before finalizing errors)
      if (parentInfoForRow.email && !errors.some(e => e.includes("Parent Email"))) {
        const existingParent = parentData.find((p) => p.email.toLowerCase() === parentInfoForRow.email.toLowerCase());
        if (existingParent) {
            parentInfoForRow.existingParentId = existingParent.$id; // Store existing parent Doc ID
            // Optional: Could add a warning if names/contacts differ here
        }
      }

      // Finalize Row
      if (errors.length > 0) {
        rowValidationErrors.push({ row: reportFileRowNumber, errors: errors.map(err => `${studentNameContext}: ${err}`), });
        errorCount++;
      } else {
        // Add successfully validated row data structure to our array
        validatedRows.push({
            studentData: studentDataForRow as ProcessedRowData['studentData'], // Cast to ensure type
            parentInfo: parentInfoForRow as ProcessedRowData['parentInfo'], // Cast to ensure type
            rowNumber: reportFileRowNumber
         });
        successCount++;
      }
    } // End row loop

    setValidationErrors(rowValidationErrors);
    setProcessedData(validatedRows); // Store the successfully processed rows
    setProcessSuccessCount(successCount);
    setProcessErrorCount(errorCount);
    setIsProcessing(false);
    setProcessResultModalOpen(true); // Open the validation results modal
  };

  // --- Handle Confirm Import (Saving Logic) ---
  const handleConfirmImport = async () => {
    if (processErrorCount > 0 || processedData.length === 0) {
      toast.error("Cannot import data with validation errors or no valid data.");
      setProcessResultModalOpen(false); // Close validation modal
      return;
    }

    setIsImporting(true);
    setImportSuccessCount(0);
    setImportErrorCount(0);
    setImportErrors([]);
    setProcessResultModalOpen(false); // Close validation modal
    setImportProgressModalOpen(true); // Open import progress modal

    let currentImportSuccess = 0;
    let currentImportErrors: { rowNumber: number; message: string }[] = [];

    for (const row of processedData) {
      const { studentData, parentInfo, rowNumber } = row;
      let finalParentDocId: string | null = null;
      let isExisting = false;

      try {
        // --- Step 1: Re-check Existing Parent using CURRENT store data ---
        const currentExistingParent = parentData.find(p => p.email.toLowerCase() === parentInfo.email.toLowerCase());
        if (currentExistingParent) {
          finalParentDocId = currentExistingParent.$id;
          isExisting = true;
          // console.log((`Row ${rowNumber}: Found existing parent Doc ID ${finalParentDocId} by email ${parentInfo.email}.`);
        } else {
          isExisting = false;
          // console.log((`Row ${rowNumber}: No existing parent found by email ${parentInfo.email}. Will create new.`);
        }

        // --- Step 2: Call Backend Signup ---
        const signupPayload = {
          isExistingParent: isExisting,
          studentName: studentData.name,
          parentName: isExisting ? undefined : parentInfo.name, // Only send if new
          parentEmail: isExisting ? undefined : parentInfo.email, // Only send if new
        };

        // console.log((`Row ${rowNumber}: Calling backend /signup`, signupPayload);
        const signupResponse = await fetch(`${SERVER_URL}/api/users/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupPayload),
        });
        const signupResult = await signupResponse.json();

        if (!signupResponse.ok) {
            // Throw error to be caught by the row's catch block
            throw new Error(signupResult.message || `User creation failed (HTTP ${signupResponse.status})`);
        }
        // console.log((`Row ${rowNumber}: Backend /signup successful`, signupResult);

        const { studentUserId, parentUserId, studentEmail } = signupResult;
        if (!studentUserId) throw new Error("Backend did not return student user ID.");


        // --- Step 3 & 4: Create Parent Document (if new) ---
        if (!isExisting) {
          if (!parentUserId) throw new Error("Backend did not return parent user ID for new parent.");
          const newParentInput = {
            id: parentUserId,
            name: parentInfo.name,
            email: parentInfo.email,
            contact: parentInfo.contact,
          };
          // console.log((`Row ${rowNumber}: Adding new parent document...`, newParentInput);
          // Type assertion needed if store expects the full structure excluding meta fields
          const createdParent = await addParentData(newParentInput as any, parentUserId);
          if (!createdParent) throw new Error("Failed to save new parent document.");
          finalParentDocId = createdParent.$id;
          // console.log((`Row ${rowNumber}: New parent document created, ID: ${finalParentDocId}`);
        }

        if (!finalParentDocId) throw new Error("Parent document ID could not be determined.");


        // --- Step 5: Create Student Document ---
        const newStudentInput = {
          id: studentUserId,
          name: studentData.name,
          class: studentData.class,
          facultyId: studentData.facultyId, // This is already the Faculty Document ID
          section: studentData.section || "",
          parentId: finalParentDocId,
          stdEmail: studentEmail, // Use email returned from backend
        };
        // console.log((`Row ${rowNumber}: Adding student document...`, newStudentInput);
         // Type assertion needed if store expects the full structure excluding meta fields
        const createdStudent = await addStudentData(newStudentInput as any, studentUserId);
        if (!createdStudent) throw new Error("Failed to save student document.");
        // console.log((`Row ${rowNumber}: Student document created, ID: ${createdStudent.$id}`);


        // --- Step 6: Update Parent's students array ---
        // console.log((`Row ${rowNumber}: Updating parent ${finalParentDocId} with student ${createdStudent.$id}`);
        const updatedParent = await updateParentData(finalParentDocId, createdStudent.$id);
        if (!updatedParent) {
           // Log a warning but don't treat as a fatal row error
           console.warn(`Row ${rowNumber}: Failed to link student ${createdStudent.$id} to parent ${finalParentDocId}. Manual check advised.`);
           toast(`Row ${rowNumber}: Student saved, but failed to link to parent.`);
        } else {
            // console.log((`Row ${rowNumber}: Parent ${finalParentDocId} updated.`);
        }

        // --- Row Success ---
        currentImportSuccess++;
        setImportSuccessCount(prev => prev + 1); // Update state incrementally

      } catch (error: any) {
        // --- Row Error ---
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error.message || "An unknown error occurred.";
        currentImportErrors.push({ rowNumber: rowNumber, message: errorMessage });
        setImportErrors(prev => [...prev, { rowNumber: rowNumber, message: errorMessage }]); // Update state
        setImportErrorCount(prev => prev + 1); // Update state
        // Continue to the next row
      }
    } // End of loop through processedData

    setIsImporting(false); // Finished importing
    // Keep import progress modal open to show final results
    toast.success(`Import finished: ${currentImportSuccess} successful, ${currentImportErrors.length} failed.`);

    // Optional: Refresh data after import?
    // fetchStudentData(); // From student store if needed elsewhere
    fetchParentData(); // Refresh parent data as it was potentially modified

  }; // End of handleConfirmImport

  // --- JSX Rendering ---
  return (
    <div className="p-6 rounded-md flex flex-col h-full">
      <Toaster position="top-right" />

      {/* Header */}
      <div className=" md:mb-6 flex justify-between mb-4 items-center">
        <h2 className="text-xl font-bold text-gray-900">
          Customize & Validate Data
        </h2>
        {isMobile && onBack && (
          <Button onPress={onBack} color="secondary" variant="flat" size="md" className="pr-[1.4rem]" startContent={<LeftArrowIcon className="mr-1" />}>
            Back
          </Button>
        )}
      </div>

      {/* Error Displays */}
      {duplicateMappingError && <ErrorMessage message={duplicateMappingError} />}
      {validationErrors.length > 0 && !duplicateMappingError && (
         <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md max-h-60 overflow-y-auto">
          <h4 className="font-bold mb-2">Validation Errors Found:</h4>
          <ul>
            {validationErrors.map((err, index) => (
              <li key={`val-err-${index}`} className="mb-2">
                <ul className="list-disc list-inside pl-1">
                  {err.errors.map((error, errorIndex) => ( <li key={`val-err-detail-${index}-${errorIndex}`} className="text-sm">{error}</li> ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Column Mapping Table */}
      <div className="overflow-x-auto mb-6 flex-grow">
        <table className="min-w-full leading-normal shadow-md rounded-lg overflow-hidden">
           <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">File Header</th>
              <th className="px-3 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Map to Field</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header, index) => (
              <tr key={`${header}-${index}`} className="hover:bg-gray-100">
                <td className="px-3 py-2 border-b border-gray-200 text-sm font-medium text-gray-900">{header}</td>
                <td className="px-3 py-2 border-b border-gray-200 text-sm">
                  <Select aria-label={`Map field for ${header}`} variant="bordered" size="sm" selectedKeys={new Set([columnMappings[header] || ""])} onSelectionChange={(keys) => { const key = Array.from(keys)[0] as string | undefined; handleColumnMappingChange(header, key || ""); }} placeholder="Select Field" className="max-w-[200px]">
                    {fieldOptions.map((option) => ( <SelectItem key={option.value} textValue={option.label}>{option.label}</SelectItem> ))}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validate Button */}
      <div className="flex justify-center mt-4 gap-4">
        <Button color="primary" onPress={processAndValidateData} isLoading={isProcessing || isImporting} disabled={isProcessing || isImporting || !!duplicateMappingError}>
          {isProcessing ? "Validating..." : "Process & Validate Data"}
        </Button>
      </div>

      {/* Validation Results Modal */}
      <Modal isOpen={processResultModalOpen} onOpenChange={setProcessResultModalOpen} isDismissable={!isProcessing && !isImporting} hideCloseButton={true}>
        <ModalContent>
          {(modalClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Validation Result</ModalHeader>
              <ModalBody className="max-h-96 overflow-y-auto">
                <div className="flex flex-col gap-3">
                  <p className="text-lg">Validation Summary:</p>
                  <p className="flex items-center gap-2">{processSuccessCount > 0 ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-gray-500" />} Rows Passed Validation: <span className="font-semibold">{processSuccessCount}</span></p>
                  <p className="flex items-center gap-2">{processErrorCount > 0 ? <XCircleIcon className="h-5 w-5 text-red-500" /> : (processSuccessCount > 0 ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-gray-500" />)} Rows with Validation Errors: <span className="font-semibold">{processErrorCount}</span></p>
                  {validationErrors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md overflow-y-auto max-h-60">
                      <h4 className="font-bold text-red-700 mb-2">Detailed Validation Errors:</h4>
                      <ul>{validationErrors.map((err, index) => (<li key={`modal-val-err-${index}`} className="mb-3"><ul className="list-disc list-inside pl-1">{err.errors.map((error, errorIndex) => (<li key={`modal-val-err-detail-${index}-${errorIndex}`} className="text-sm text-red-700">{error}</li>))}</ul></li>))}</ul>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                {/* Show Confirm Import button only if validation succeeded */}
                {processErrorCount === 0 && processSuccessCount > 0 && (
                    <Button color="success" variant="shadow" className="text-white font-medium" onPress={handleConfirmImport} isLoading={isImporting} disabled={isImporting}>
                       {isImporting ? "Importing..." : `Confirm Import (${processSuccessCount} Rows)`}
                    </Button>
                )}
                {/* Close button for errors or if no successful rows */}
                 {(processErrorCount > 0 || processSuccessCount === 0) && (
                    <Button color="primary" onPress={() => setProcessResultModalOpen(false)} disabled={isImporting}>
                       Close
                    </Button>
                 )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Import Progress/Results Modal */}
      <Modal isOpen={importProgressModalOpen} onOpenChange={setImportProgressModalOpen} isDismissable={!isImporting} hideCloseButton={true}>
        <ModalContent>
          {(modalClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Import Result</ModalHeader>
              {/* Show progress bar only while importing */}
              {isImporting && <Progress size="sm" isIndeterminate aria-label="Importing..." className="absolute top-0 left-0 w-full" />}
              <ModalBody className="max-h-96 overflow-y-auto pt-4"> {/* Add padding top */}
                <div className="flex flex-col gap-3">
                  <p className="text-lg">Import Summary:</p>
                   {/* Show counts even during import */}
                  <p className="flex items-center gap-2"><CheckCircleIcon className={`h-5 w-5 ${importSuccessCount > 0 ? 'text-green-500' : 'text-gray-400'}`} /> Rows Imported Successfully: <span className="font-semibold">{importSuccessCount}</span></p>
                  <p className="flex items-center gap-2"><XCircleIcon className={`h-5 w-5 ${importErrorCount > 0 ? 'text-red-500' : 'text-gray-400'}`} /> Rows Failed to Import: <span className="font-semibold">{importErrorCount}</span></p>

                  {/* Display import errors */}
                  {importErrors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md overflow-y-auto max-h-60">
                      <h4 className="font-bold text-red-700 mb-2">Import Errors:</h4>
                      <ul>
                        {importErrors.map((err, index) => (
                          <li key={`imp-err-${index}`} className="mb-2">
                              <strong className="font-semibold text-red-600">File Row {err.rowNumber}:</strong>
                              <span className="text-sm text-red-700 ml-2">{err.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                   {/* Message when import is finished */}
                   {!isImporting && importErrors.length === 0 && importSuccessCount > 0 && (
                        <p className="mt-3 text-green-700 font-medium">Import completed successfully!</p>
                   )}
                   {!isImporting && importErrors.length > 0 && (
                        <p className="mt-3 text-orange-700 font-medium">Import completed with some errors.</p>
                   )}
                </div>
              </ModalBody>
              <ModalFooter>
                {/* Close button only appears after import finishes */}
                {!isImporting && (
                   <Button color="primary" onPress={() => setImportProgressModalOpen(false)}>
                     Close
                   </Button>
                )}
                 {/* Optional: Add a cancel button during import? (More complex) */}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </div> // End of main component div
  );
};

export default Customize;