// // src/pages/parent/ParentDashboardPage.tsx (or similar)
// import React, { useState, useEffect, useCallback } from 'react';
// import { databases, Query, getCurrentUserEmail, account } from '~/utils/appwrite'; // Your provided appwrite.ts
// import { Parent, Student } from 'types/models'; // Adjust path
// import SelectStudent from './Select/SelectStudent';
// import DisplayStudentRecords from './Select/DisplayStudentRecords';
// import { AcademicCapIcon, ArrowRightOnRectangleIcon, InformationCircleIcon, UserCircleIcon } from '@heroicons/react/24/outline'; // For logout

// const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
// const PARENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PARENT_COLLECTION_ID as string;
// const STUDENT_COLLECTION_ID = import.meta.env.VITE_APPWRITE_STUDENT_COLLECTION_ID as string;

// const ParentDashboardPage: React.FC = () => {
//   const [currentUser, setCurrentUser] = useState<any | null>(null); // Store full user object
//   const [parent, setParent] = useState<Parent | null>(null);
//   const [students, setStudents] = useState<Student[]>([]);
//   const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

//   const [isLoadingParent, setIsLoadingParent] = useState<boolean>(true);
//   const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false); // Separate loading for students
//   const [error, setError] = useState<string | null>(null);

//   const fetchParentAndStudents = useCallback(async (userEmail: string, userId: string) => {
//     setIsLoadingParent(true);
//     setIsLoadingStudents(true); // Start loading students too
//     setError(null);
//     let parentData: Parent | null = null;

//     try {
//       // Try fetching parent by email first (common case)
//       const parentResponseByEmail = await databases.listDocuments<Parent>(
//         DATABASE_ID,
//         PARENT_COLLECTION_ID,
//         [Query.equal('email', userEmail), Query.limit(1)]
//       );

//       if (parentResponseByEmail.documents.length > 0) {
//         parentData = parentResponseByEmail.documents[0];
//       } else {
//         // Fallback: If parent has user ID linked (e.g., in a 'userId' attribute in coll-parent)
//         // This depends on your schema. If not applicable, remove this block.
//         // const parentResponseById = await databases.listDocuments<Parent>(
//         //   DATABASE_ID,
//         //   PARENT_COLLECTION_ID,
//         //   [Query.equal('userId', userId), Query.limit(1)] // Assuming 'userId' attribute
//         // );
//         // if (parentResponseById.documents.length > 0) {
//         //   parentData = parentResponseById.documents[0];
//         // }
//       }

//       if (parentData) {
//         setParent(parentData);
//         // Now fetch students associated with this parent
//         if (parentData.$id) {
//           const studentResponse = await databases.listDocuments<Student>(
//             DATABASE_ID,
//             STUDENT_COLLECTION_ID,
//             [Query.equal('parentId', parentData.$id), Query.orderAsc('name')] // Order students by name
//           );
//           setStudents(studentResponse.documents);
//           if (studentResponse.documents.length > 0) {
//             setSelectedStudentId(studentResponse.documents[0].$id); // Auto-select first student
//           } else {
//             setSelectedStudentId(null);
//           }
//         } else {
//           setError("Parent data found, but missing ID to fetch students.");
//           setStudents([]);
//           setSelectedStudentId(null);
//         }
//       } else {
//         setError(`No parent record found for user ${userEmail}. Please contact support if this is an error.`);
//         setStudents([]);
//         setSelectedStudentId(null);
//       }
//     } catch (err: any) {
//       console.error('Error fetching parent or student data:', err);
//       setError(err.message || 'Failed to load dashboard data. Please try again.');
//       setStudents([]);
//       setSelectedStudentId(null);
//     } finally {
//       setIsLoadingParent(false);
//       setIsLoadingStudents(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (!DATABASE_ID || !PARENT_COLLECTION_ID || !STUDENT_COLLECTION_ID) {
//       setError("Appwrite configuration missing. Please check environment variables.");
//       setIsLoadingParent(false);
//       setIsLoadingStudents(false);
//       return;
//     }

//     const init = async () => {
//       try {
//         const user = await account.get();
//         setCurrentUser(user);
//         if (user.email) {
//           fetchParentAndStudents(user.email, user.$id);
//         } else {
//           setError("Could not retrieve current user's email. Please log in again.");
//           setIsLoadingParent(false);
//           setIsLoadingStudents(false);
//         }
//       } catch (e) {
//         setError("You are not logged in or session expired. Please log in.");
//         // Potentially redirect to login page here
//         // history.push('/login');
//         setIsLoadingParent(false);
//         setIsLoadingStudents(false);
//       }
//     };
//     init();
//   }, [fetchParentAndStudents]);

//   const handleStudentSelect = (studentId: string | null) => {
//     setSelectedStudentId(studentId);
//   };

//   const handleLogout = async () => {
//     try {
//       await account.deleteSession('current');
//       setCurrentUser(null);
//       setParent(null);
//       setStudents([]);
//       setSelectedStudentId(null);
//       // Redirect to login or home page
//       // For example, if using React Router: history.push('/login');
//       alert("Logged out successfully!");
//        window.location.reload(); // Simple way to reset state and redirect (if router guards are setup)
//     } catch (e) {
//       console.error("Logout failed", e);
//       setError("Logout failed. Please try again.");
//     }
//   };

//   const selectedStudent = students.find(s => s.$id === selectedStudentId) || null;

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Header Bar */}
//       <header className="bg-white shadow-md">
//         <div className="container mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between h-16">
//             <div className="flex items-center">
//               <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
//               <span className="ml-2 text-xl font-semibold text-gray-800">Parent Portal</span>
//             </div>
//             {currentUser && (
//               <div className="flex items-center">
//                 <span className="text-sm text-gray-600 mr-3 hidden sm:block">
//                   Welcome, {parent?.name || currentUser.name || 'Parent'}
//                 </span>
//                 {/* <button
//                   onClick={handleLogout}
//                   className="p-2 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition"
//                   title="Logout"
//                 >
//                   <ArrowRightOnRectangleIcon className="h-6 w-6" />
//                 </button> */}
//               </div>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="container mx-auto p-4 sm:p-6 lg:p-8">
//         {isLoadingParent && !error && (
//           <div className="text-center py-10">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
//             <p className="mt-4 text-gray-600">Loading your information...</p>
//           </div>
//         )}

//         {error && (
//           <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md" role="alert">
//             <div className="flex">
//               <div className="py-1"><InformationCircleIcon className="h-6 w-6 text-red-500 mr-3" /></div>
//               <div>
//                 <p className="font-bold">Error</p>
//                 <p className="text-sm">{error}</p>
//               </div>
//             </div>
//           </div>
//         )}

//         {!isLoadingParent && !error && parent && (
//           <>
//             <div className="mb-8 p-6 bg-white shadow rounded-lg">
//               <h1 className="text-2xl font-semibold text-gray-800 mb-1">
//                 Hello, {parent.name}!
//               </h1>
//               <p className="text-gray-600">Manage your student's records and stay updated.</p>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
//               <div className="lg:col-span-1 bg-white p-6 shadow rounded-lg">
//                 <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Student</h2>
//                 <SelectStudent
//                   students={students}
//                   selectedStudentId={selectedStudentId}
//                   onStudentSelect={handleStudentSelect}
//                   isLoading={isLoadingStudents}
//                 />
//                  {students.length > 0 && !selectedStudentId && !isLoadingStudents && (
//                     <p className="mt-2 text-sm text-indigo-600">
//                         Please select a child to see their details.
//                     </p>
//                 )}
//               </div>

//               <div className="lg:col-span-2">
//                 <DisplayStudentRecords student={selectedStudent} isLoading={isLoadingStudents && !!selectedStudentId} />
//               </div>
//             </div>
//           </>
//         )}

//         {!isLoadingParent && !error && !parent && (
//           <div className="text-center py-10">
//             <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
//             <p className="mt-4 text-gray-600">
//               Parent information could not be loaded. If you are a new user, it might take some time for your account to be set up.
//             </p>
//           </div>
//         )}
//       </main>
//        {/* Footer */}
//        <footer className="py-6 mt-10 text-center text-sm text-gray-500 border-t border-gray-200">
//             © {new Date().getFullYear()} School Management System. All rights reserved.
//         </footer>
//     </div>
//   );
// };

// export default ParentDashboardPage;

import React from 'react'
import SelectStudentComponent from './Select/SelectStudent'
import DisplayStudentComponent from './Select/DisplayStudentRecords'

const Dashboard = () => {
  return (
    <div>

<SelectStudentComponent />
<DisplayStudentComponent /> 

    </div>
  )
}

export default Dashboard