// src/pages/library/LibraryDashboardPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardBody, Chip, Avatar } from '@heroui/react';
import { ExclamationTriangleIcon, BookOpenIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { toast } from 'react-hot-toast';

import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';

// Adjust paths based on your project structure if these are not using barrel files
import PageHeader from '../common/PageHeader';
import CustomSelect, { SelectOption } from '../../../common/CustomSelect';
import DashboardBookInfo from './DashboardBookInfo'; // Ensure this path is correct

import { useLibraryStore } from '~/store/libraryStore';
import type { Document as AppwriteDocument } from 'types/appwrite';
import type { BookBorrowing, LibraryUser, Book, BookGenre } from 'types/library';
import { calculateDaysOverdue } from '../../utils/helpers';
import { convertADtoBS } from '../../utils/dateConverter';
import * as userService from '../../services/userService';

// Simple Loading Spinner (can be moved to a common component file)
const LoadingSpinner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex justify-center items-center h-full ${className}`}>
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

interface GenreBorrowData {
  name: string;
  count: number;
}
interface FacultyBorrowData {
  name: string;
  count: number;
}
interface OverdueItem extends AppwriteDocument<BookBorrowing> { // Ensure BookBorrowing has userName, bookName from enrichment
  daysOverdue: number;
}

const LibraryDashboardPage: React.FC = () => {
  // SECTION 1: ALL HOOK CALLS (Top Level)
  const {
    allBorrowingsForDashboard: allBorrowings,
    isLoadingAllBorrowings: isLoadingStoreBorrowings,
    fetchAllBorrowingsForDashboard,
    genres,
    fetchGenres,
    isLoadingGenres,
    books,
    fetchBooks,
    isLoadingBooks: isLoadingStoreBooks,
    faculties,
    fetchFacultiesForDashboard,
    isLoadingFaculties,
  } = useLibraryStore();

  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [isLoadingStudentData, setIsLoadingStudentData] = useState(true);
  const [allStudents, setAllStudents] = useState<AppwriteDocument<LibraryUser>[]>([]);
  const [activeIndexGenre, setActiveIndexGenre] = useState(0);

  const isInitialStoreDataLoading = isLoadingStoreBorrowings || isLoadingGenres || isLoadingStoreBooks || isLoadingFaculties;

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
        if (allBorrowings.length === 0 && !isLoadingStoreBorrowings && isMounted) {
          await fetchAllBorrowingsForDashboard().catch(err => { if(isMounted) toast.error("Failed to load borrowing data."); console.error("Dashboard: Error fetching borrowings", err); });
        }
        if (genres.length === 0 && !isLoadingGenres && isMounted) {
          await fetchGenres().catch(err => { if(isMounted) toast.error("Failed to load genres."); console.error("Dashboard: Error fetching genres", err); });
        }
        if (books.length === 0 && !isLoadingStoreBooks && isMounted) {
          await fetchBooks(undefined, 500).catch(err => { if(isMounted) toast.error("Failed to load book details."); console.error("Dashboard: Error fetching books", err); });
        }
        if (faculties.length === 0 && !isLoadingFaculties && isMounted) {
          await fetchFacultiesForDashboard().catch(err => { if(isMounted) toast.error("Failed to load faculties."); console.error("Dashboard: Error fetching faculties", err); });
        }
    };
    loadInitialData();
    return () => { isMounted = false; }
  }, [
    allBorrowings.length, isLoadingStoreBorrowings, fetchAllBorrowingsForDashboard,
    genres.length, isLoadingGenres, fetchGenres,
    books.length, isLoadingStoreBooks, fetchBooks,
    faculties.length, isLoadingFaculties, fetchFacultiesForDashboard
  ]);

  useEffect(() => {
    let isMounted = true;
    const fetchAllStudentsForDashboard = async () => {
        if (!isMounted) return;
        setIsLoadingStudentData(true);
        try {
            const studentData = await userService.searchUsers('', 'student', 1000);
            if (isMounted) setAllStudents(studentData as AppwriteDocument<LibraryUser>[]);
        } catch (error) {
            if (isMounted) toast.error("Failed to load student data for faculty filtering.");
            console.error("Dashboard: Error fetching student data:", error);
        } finally {
            if (isMounted) setIsLoadingStudentData(false);
        }
    };
    fetchAllStudentsForDashboard();
    return () => { isMounted = false; }
  }, []);

  const overdueBorrowings = useMemo((): OverdueItem[] => {
    return allBorrowings
      .filter(b => b.status === 'borrowed' && b.dueDate)
      .map(b => ({ ...b, daysOverdue: calculateDaysOverdue(b.dueDate) }))
      .filter(b => b.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [allBorrowings]);

  const borrowsByGenre = useMemo((): GenreBorrowData[] => {
    if (genres.length === 0 || allBorrowings.length === 0) return [];
    const counts: Record<string, number> = {};
    allBorrowings.forEach(borrowing => {
      const genreId = borrowing.genreId; 
      if (genreId) {
        const genreName = genres.find(g => g.$id === genreId)?.name || 'Unknown Genre';
        counts[genreName] = (counts[genreName] || 0) + 1;
      } else {
        counts['Genre Not Specified'] = (counts['Genre Not Specified'] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count);
  }, [allBorrowings, genres]);

  const borrowsByFaculty = useMemo((): FacultyBorrowData[] => {
    if (faculties.length === 0 || allStudents.length === 0 || allBorrowings.length === 0) return [];
    const studentFacultyMap = new Map<string, string>();
    allStudents.forEach(student => {
        if (student.id && student.facultyId) {
            studentFacultyMap.set(student.id, student.facultyId);
        }
    });
    const counts: Record<string, number> = {};
    allBorrowings.forEach(borrowing => {
        if (borrowing.userType === 'student' && borrowing.userId) {
            const facultyIdOfBorrower = studentFacultyMap.get(borrowing.userId);
            if (facultyIdOfBorrower) {
                if (!selectedFacultyId || facultyIdOfBorrower === selectedFacultyId) {
                    const facultyName = faculties.find(f => f.id === facultyIdOfBorrower)?.name || `Faculty ID: ${facultyIdOfBorrower.substring(0,6)}`;
                    counts[facultyName] = (counts[facultyName] || 0) + 1;
                }
            } else if (!selectedFacultyId) {
                 counts['Faculty Unknown'] = (counts['Faculty Unknown'] || 0) + 1;
            }
        }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count);
  }, [allBorrowings, allStudents, faculties, selectedFacultyId]);

  const facultyOptions: SelectOption[] = useMemo(() => 
      [{ id: 'ALL_FACULTIES', name: 'All Faculties' }, ...faculties.map(f => ({ id: f.id, name: f.name }))]
  , [faculties]);

  const onPieEnterGenre = useCallback((_:any, index:number) => { setActiveIndexGenre(index); }, []);
  
  // SECTION 2: EARLY RETURNS (AFTER ALL HOOKS)
  if (isInitialStoreDataLoading || isLoadingStudentData) {
    return (
      <div className="p-4 md:p-6 flex flex-col justify-center items-center h-[calc(100vh-150px)]">
        <LoadingSpinner />
        <p className="mt-3 text-gray-600">Loading dashboard data, please wait...</p>
      </div>
    );
  }
  
  const essentialDataMissing = genres.length === 0 || faculties.length === 0 || allBorrowings.length === 0 || books.length === 0;
  if (essentialDataMissing && !isInitialStoreDataLoading && !isLoadingStudentData) {
      return (
          <div className="p-4 md:p-6 text-center text-red-500">
              <p>Could not load essential dashboard data. Some information might be missing.</p>
              <p className="text-sm text-gray-500">Please try refreshing or check if there's data in the system.</p>
          </div>
      );
  }

  // SECTION 3: NON-HOOK CONSTANTS AND HELPER FUNCTIONS
  const COLORS_GENRE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82Ca9D', '#FF5733', '#C70039', '#A233FF', '#FFC300'];
  const COLORS_FACULTY = ['#FF8C00', '#A0522D', '#5F9EA0', '#DEB887', '#7FFF00', '#D2691E', '#6495ED'];

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 8) * cos;
    const sy = cy + (outerRadius + 8) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 18;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={4} textAnchor="middle" fill={fill} fontSize="14" fontWeight="bold">
          {payload.name}
        </text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 7} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 10} y={ey} textAnchor={textAnchor} fill="#333" fontSize="12">{`${value} borrows`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 10} y={ey} dy={15} textAnchor={textAnchor} fill="#999" fontSize="11">
          {`(Rate ${(percent * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };
  
  // SECTION 4: JSX RETURN
  return (
    <PerfectScrollbar options={{ suppressScrollX: true }}>

    <div className="p-4 md:p-6 space-y-8 bg-gray-50 min-h-screen">
      <PageHeader title="Library Dashboard" />

      {/* Key Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card shadow="sm">
          <CardBody className="flex-row items-center justify-center p-9 gap-3">
            <div className="p-3.5 rounded-full bg-red-100 text-red-600 mr-4">
              <ExclamationTriangleIcon className="w-7 h-7" />
            </div>
            <div className=' text-center'>
              <p className="text-3xl font-semibold text-gray-800">{overdueBorrowings.length}</p>
              <p className="text-sm font-medium text-gray-500">Total Overdue Books</p>
            </div>
          </CardBody>
        </Card>
        <Card shadow="sm">
        <CardBody className="flex-row items-center justify-center p-9 gap-3">
        <div className="p-3.5 rounded-full bg-blue-100 text-blue-600 mr-4">
              <BookOpenIcon className="w-7 h-7" />
            </div>
            <div className=' text-center'>
              <p className="text-3xl font-semibold text-gray-800">{allBorrowings.length}</p>
              <p className="text-sm font-medium text-gray-500">Total Books Borrowed</p>
            </div>
          </CardBody>
        </Card>
         <Card shadow="sm">
         <CardBody className="flex-row items-center justify-center p-9 gap-3">
         <div className="p-3.5 rounded-full bg-green-100 text-green-600 mr-4">
              <UserGroupIcon className="w-7 h-7" />
            </div>
            <div className=' text-center'>
              <p className="text-3xl font-semibold text-gray-800">{new Set(allBorrowings.map(b => b.userId)).size}</p>
              <p className="text-sm font-medium text-gray-500">Unique Borrowers</p>
            </div>
          </CardBody>
        </Card>
      </div>

   {/* Charts Section */}
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card shadow="sm">
          <CardBody className="overflow-hidden">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 p-3 pl-5">Borrows by Genre</h3>
            {borrowsByGenre.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndexGenre}
                    activeShape={renderActiveShape}
                    data={borrowsByGenre}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    onMouseEnter={onPieEnterGenre}
                    paddingAngle={2}
                  >
                    {borrowsByGenre.map((entry, index) => (
                      <Cell key={`cell-genre-${index}`} fill={COLORS_GENRE[index % COLORS_GENRE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} borrows`, name as string]}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-500 py-10 h-[380px] flex items-center justify-center">No borrowing data by genre available.</p>}
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardBody className="overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <h3 className="text-xl font-semibold text-gray-800 pl-6">Student Borrows by Faculty</h3>
                <CustomSelect
                    labelClassName="text-xs sr-only"
                    label="Filter by Faculty"
                    options={facultyOptions}
                    value={selectedFacultyId}
                    onChange={(val) => setSelectedFacultyId(val === 'ALL_FACULTIES' ? null : val)}
                    placeholder="All Faculties"
                    size="sm"
                    className="min-w-[220px] w-full sm:w-auto"
                />
            </div>
            {borrowsByFaculty.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={borrowsByFaculty} margin={{ top: 5, right: 10, left: -20, bottom: 55 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{fontSize: 12, dy: 5}} />
                        <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                        <Tooltip formatter={(value, name) => [`${value} borrows`, name as string]}/>
                        <Legend wrapperStyle={{fontSize: "15px"}}/>
                        <Bar dataKey="count" name={selectedFacultyId ? "Borrows" : "Borrows per Faculty"} barSize={25} legendType="none">
                            {borrowsByFaculty.map((entry, index) => (
                                <Cell key={`cell-faculty-${index}`} fill={COLORS_FACULTY[index % COLORS_FACULTY.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : <p className="text-center text-gray-500 py-10 h-[350px] flex items-center justify-center">No student borrowing data for {selectedFacultyId ? faculties.find(f=>f.id === selectedFacultyId)?.name : 'any faculty'}.</p>}
          </CardBody>
        </Card>
      </div>

     <div className='flex w-full'>
       {/* DashboardBookInfo Component */}
       <DashboardBookInfo 
        books={books} 
        allBorrowings={allBorrowings} 
        isLoading={isLoadingStoreBooks || isLoadingStoreBorrowings}
      />

      {/* Overdue Books List */}
      {overdueBorrowings.length > 0 && (
        <Card shadow="md" className='w-full ml-4'>
          <CardBody>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 pt-2 pl-3"> Overdue Books </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {overdueBorrowings.map(item => (
                <div key={item.$id} className="p-3 border border-gray-200 rounded-lg flex justify-between items-center hover:shadow-sm transition-shadow">
                  <div className="flex items-center space-x-3">
                  <Avatar name={item.userName ? item.userName.substring(0,1) : 'U'} size="md" color="danger" />
                  <div className=''>
                    <p className="font-medium text-gray-700">{item.bookName || 'Unknown Book'}</p>
                  <div className=' flex gap-6'>
                  <p className="text-xs text-gray-500">
                    By: {item.userName || 'Unknown User'} ({item.userType})
                    </p>
                    <p className="text-xs text-gray-500">
                    Due (BS): {convertADtoBS(item.dueDate)}
                    </p>
                  </div>
                  </div>
                  </div>
                  <Chip color="danger" variant="flat">{item.daysOverdue} days overdue</Chip>
                </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}
      
     </div>
   
    </div>
    </PerfectScrollbar >

  );
};

export default LibraryDashboardPage;