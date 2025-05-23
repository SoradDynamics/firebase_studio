// src/pages/admin/FeeConfigurationPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, SelectItem, Spinner, Card, CardBody } from '@heroui/react';
import SearchBar from '../../common/SearchBar'; // Adjust path
import FeeCard from './Fee/FeeCard';
import FeeEditDrawer from './Fee/FeeEditDrawer';
import { getFaculties, getFeeConfigsByFaculty, parseFeeDesc } from './Fee/service'; // Removed getSectionsByFaculty
import type { Faculty, FeeConfigDocument, ClassFeeDisplayInfo, ProcessedFeeConfig } from 'types/fee-config';

const FeeConfigurationPage: React.FC = () => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null); // Store the whole faculty object
  const [feeConfigsForSelectedFaculty, setFeeConfigsForSelectedFaculty] = useState<FeeConfigDocument[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingFaculties, setIsLoadingFaculties] = useState(true);
  const [isLoadingFeeConfigs, setIsLoadingFeeConfigs] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentConfigToEdit, setCurrentConfigToEdit] = useState<(ProcessedFeeConfig & { facultyName: string }) | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingFaculties(true);
      try {
        const fetchedFaculties = await getFaculties();
        setFaculties(fetchedFaculties);
        if (fetchedFaculties.length > 0 && !selectedFaculty) {
          setSelectedFaculty(fetchedFaculties[0]); // Auto-select first faculty object
        }
      } catch (error) {
        console.error("Error fetching faculties:", error);
      } finally {
        setIsLoadingFaculties(false);
      }
    };
    fetchInitialData();
  }, []); // Run once

  const loadFeeConfigsForFaculty = useCallback(async (facultyId: string) => {
    if (!facultyId) {
      setFeeConfigsForSelectedFaculty([]);
      return;
    }
    setIsLoadingFeeConfigs(true);
    try {
      const fetchedFeeConfigs = await getFeeConfigsByFaculty(facultyId);
      setFeeConfigsForSelectedFaculty(fetchedFeeConfigs);
    } catch (error) {
      console.error(`Error fetching fee configs for faculty ${facultyId}:`, error);
      setFeeConfigsForSelectedFaculty([]);
    } finally {
      setIsLoadingFeeConfigs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFaculty) {
      loadFeeConfigsForFaculty(selectedFaculty.$id);
    } else {
      setFeeConfigsForSelectedFaculty([]);
    }
  }, [selectedFaculty, loadFeeConfigsForFaculty]);

  const classFeeDisplayInfos = useMemo<ClassFeeDisplayInfo[]>(() => {
    if (!selectedFaculty || !selectedFaculty.classes) return [];

    // Create a map of existing fee configurations for the selected faculty for quick lookup
    const feeConfigMap = new Map<string, ProcessedFeeConfig>();
    feeConfigsForSelectedFaculty.forEach(fc => {
      feeConfigMap.set(fc.className, {
        $id: fc.$id,
        facultyId: fc.facultyId,
        className: fc.className,
        fees: parseFeeDesc(fc.desc),
      });
    });

    // Create display info for each class in the selected faculty's 'classes' array
    return (selectedFaculty.classes || []) // Ensure classes array exists
      .map(classNameFromFaculty => {
        const processedFeeConfig = feeConfigMap.get(classNameFromFaculty);
        return {
          key: `${selectedFaculty.$id}-${classNameFromFaculty}`,
          facultyId: selectedFaculty.$id,
          facultyName: selectedFaculty.name,
          className: classNameFromFaculty,
          processedFeeConfig: processedFeeConfig,
        };
      })
      .filter(classInfo =>
        classInfo.className.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.className.localeCompare(b.className)); // Optional: sort classes alphabetically
  }, [selectedFaculty, feeConfigsForSelectedFaculty, searchTerm]);

  const handleFacultySelectionChange = (keys: Set<string> | any) => { // 'any' for HeroUI Select type
    const facultyId = Array.from(keys as Set<string>)[0];
    const faculty = faculties.find(f => f.$id === facultyId) || null;
    setSelectedFaculty(faculty);
  };

  const handleEditFee = (config: ProcessedFeeConfig & { facultyName: string }) => {
    setCurrentConfigToEdit(config);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setCurrentConfigToEdit(null);
  };

  const handleSaveSuccess = () => {
    if (selectedFaculty) {
      loadFeeConfigsForFaculty(selectedFaculty.$id); // Refresh fee configs for the current faculty
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen dark:bg-gray-900">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Fee Configuration</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage school fee structures for classes within faculties.</p>
      </header>

      <Card className="p-4 bg-white dark:bg-gray-800 shadow-md">
        <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <Select
                    label="Select Faculty"
                    placeholder="Choose a faculty"
                    selectedKeys={selectedFaculty ? [selectedFaculty.$id] : []}
                    onSelectionChange={handleFacultySelectionChange}
                    isLoading={isLoadingFaculties}
                    isDisabled={isLoadingFaculties || faculties.length === 0}
                    className="w-full"
                >
                    {faculties.map((faculty) => (
                    <SelectItem key={faculty.$id} value={faculty.$id}>
                        {faculty.name}
                    </SelectItem>
                    ))}
                </Select>
                <SearchBar
                    placeholder="Search classes..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="w-full"
                    inputClassName={!selectedFaculty || isLoadingFeeConfigs ? "bg-gray-100 dark:bg-gray-700" : ""}
                    disabled={!selectedFaculty || isLoadingFeeConfigs}
                />
            </div>
        </CardBody>
      </Card>

      {!selectedFaculty && !isLoadingFaculties ? (
         <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
                {faculties.length === 0 ? "No faculties found. Please add faculties and define their classes." : "Please select a faculty to view and configure fees."}
            </p>
        </div>
      ) : isLoadingFeeConfigs && selectedFaculty ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" label={`Loading fee configurations for ${selectedFaculty.name}...`} />
        </div>
      ) : classFeeDisplayInfos.length === 0 && searchTerm && selectedFaculty ? (
        <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No classes found matching "{searchTerm}" for {selectedFaculty.name}.</p>
        </div>
      ) : classFeeDisplayInfos.length === 0 && !searchTerm && selectedFaculty && (!selectedFaculty.classes || selectedFaculty.classes.length === 0) ? (
         <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400 text-lg">{selectedFaculty.name} has no classes defined. Please edit the faculty to add classes.</p>
        </div>
      ) : classFeeDisplayInfos.length === 0 && !searchTerm && selectedFaculty ? (
        <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No classes found or no fee configurations yet for {selectedFaculty.name}. Click a class card to configure.</p>
             {/* This case might also mean all classes are filtered out. If selectedFaculty.classes is empty, the above message is more appropriate */}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classFeeDisplayInfos.map((info) => (
            <FeeCard key={info.key} classFeeInfo={info} onEdit={handleEditFee} />
          ))}
        </div>
      )}

      {currentConfigToEdit && (
        <FeeEditDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          onSaveSuccess={handleSaveSuccess}
          configToEdit={currentConfigToEdit}
        />
      )}
    </div>
  );
};

export default FeeConfigurationPage;