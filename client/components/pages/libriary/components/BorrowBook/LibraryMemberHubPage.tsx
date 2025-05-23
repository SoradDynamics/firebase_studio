// src/pages/library/LibraryMemberHubPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input, Button, Chip, Avatar, Card, CardBody, Tabs, Tab } from '@heroui/react';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, UsersIcon } from '@heroicons/react/24/outline';

import PageHeader from '../common/PageHeader';
import DataTable, { ColumnDef } from '../common/DataTable';
import MemberDetailView from './MemberDetailView';
// import LoadingOverlay from '~/components/common/LoadingOverlay'; // If you still want a general one

import * as userService from '../../services/userService';
import type { LibraryUser, UserType } from 'types/library';

const LibraryMemberHubPage: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'members' | 'search'>('members');
  
  const [libraryMembers, setLibraryMembers] = useState<LibraryUser[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchType, setUserSearchType] = useState<UserType>('student');
  const [searchedUsers, setSearchedUsers] = useState<LibraryUser[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  const [selectedUserForDetail, setSelectedUserForDetail] = useState<LibraryUser | null>(null);

  const fetchActiveLibraryMembers = useCallback(async (showLoading = true) => {
    if(showLoading) setIsLoadingMembers(true);
    try {
      // Fetch a larger number and filter, or adapt userService.searchUsers
      const students = await userService.searchUsers('', 'student', 200); 
      const teachers = await userService.searchUsers('', 'teacher', 100);
      const active = [...students, ...teachers].filter(u => u.isLibraryMember);
      setLibraryMembers(active);
    } catch (error) {
      toast.error("Failed to load library members.");
      console.error("Fetch Active Members Error:", error)
    } finally {
      if(showLoading) setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (activeMainTab === 'members' && !selectedUserForDetail) {
      fetchActiveLibraryMembers();
    }
  }, [activeMainTab, selectedUserForDetail, fetchActiveLibraryMembers]);

  const handleGlobalUserSearch = useCallback(async () => {
    if (userSearchTerm.trim().length < 2) {
      setSearchedUsers([]); return;
    }
    setIsLoadingSearch(true);
    try {
      const users = await userService.searchUsers(userSearchTerm, userSearchType, 20);
      setSearchedUsers(users);
    } catch (error) {
      toast.error("Failed to search users.");
      console.error("Global User Search Error:", error);
    } finally {
      setIsLoadingSearch(false);
    }
  }, [userSearchTerm, userSearchType]);

  useEffect(() => {
    if (activeMainTab === 'search' && userSearchTerm.trim().length >= 2 && !selectedUserForDetail) {
      const handler = setTimeout(() => {
        handleGlobalUserSearch();
      }, 500);
      return () => clearTimeout(handler);
    } else if (activeMainTab === 'search' && !selectedUserForDetail) {
      setSearchedUsers([]);
    }
  }, [userSearchTerm, userSearchType, activeMainTab, selectedUserForDetail, handleGlobalUserSearch]);


  const handleUserSelectForDetail = (user: LibraryUser) => {
    setSelectedUserForDetail(user);
  };

  const handleBackFromDetail = () => {
    const previouslySelectedUser = selectedUserForDetail; // Capture before clearing
    setSelectedUserForDetail(null);
    // Re-fetch lists if the user we were viewing might have changed status that affects the lists
    if (previouslySelectedUser) {
        if (activeMainTab === 'members') {
            fetchActiveLibraryMembers(false); // Re-fetch without full loading spinner if possible
        }
        // Optionally, if coming back to search, and search term is still active, re-run search
        // if (activeMainTab === 'search' && userSearchTerm.trim().length >= 2) {
        //     handleGlobalUserSearch();
        // }
    }
  };
  
  const handleMembershipChangeInDetail = (updatedUser: LibraryUser) => {
    setSelectedUserForDetail(updatedUser); // Keep detail view open with updated user
    // Update lists in the background
    if (activeMainTab === 'members') {
        fetchActiveLibraryMembers(false); // No full loading overlay
    }
    if (activeMainTab === 'search') {
        setSearchedUsers(prev => prev.map(u => u.$id === updatedUser.$id ? updatedUser : u));
    }
  };

  const handleDataUpdateInDetail = () => {
    // This is called when borrow/return happens in detail view.
    // The detail view itself re-fetches its own data.
    // If parent lists need an update (e.g., active members list reflecting new borrow counts if shown),
    // this is where you'd trigger it. For now, we rely on fetch on back or tab switch.
    // Example: if active members list showed # of borrowed books, you'd call fetchActiveLibraryMembers(false) here.
  };

  const memberColumns: ColumnDef<LibraryUser>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center">
          <Avatar name={row.name ? row.name.substring(0,1) : '?'} size="sm" className="mr-2"/>
          {row.name || 'N/A'}
        </div>
      ),
    },
    { accessorKey: 'type', header: 'Type', cell: (row) => <Chip size="sm" className="capitalize">{row.type || 'N/A'}</Chip> },
    { 
      accessorKey: 'actions', 
      header: 'Actions', 
      cell: (row) => (
        <Button size="sm" variant="faded" color="primary" onPress={() => handleUserSelectForDetail(row)}>View Details</Button>
      )
    },
  ], []);

  if (selectedUserForDetail) {
    return (
      <div className="p-2 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
        <MemberDetailView 
            member={selectedUserForDetail} 
            onBack={handleBackFromDetail}
            onMembershipChange={handleMembershipChangeInDetail}
            onDataUpdate={handleDataUpdateInDetail}
        />
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-6">
      <PageHeader title="Library Member Hub" />

      <Tabs 
        aria-label="Library Hub Main Tabs" 
        selectedKey={activeMainTab}
        onSelectionChange={(key) => {
            setActiveMainTab(key as 'members' | 'search');
            if (key === 'search') { // Clear previous search results when switching TO search tab
                setUserSearchTerm(''); // Optionally clear search term too
                setSearchedUsers([]);
            }
        }}
        color="primary" variant='underlined'
        radius="md"
        className="sticky top-0 bg-white/80 backdrop-blur-md z-20 py-2 -mx-2 px-2 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 shadow-sm"
      >
        <Tab key="members" title={<div className="flex items-center gap-2 py-1"><UsersIcon className="w-5 h-5" /> Active Members</div>}>
            <Card className="mt-2">
                <CardBody>
                    {isLoadingMembers && <div className="text-center py-10 text-gray-500">Loading members...</div>}
                    {!isLoadingMembers && libraryMembers.length === 0 && <div className="text-center py-10 text-gray-500">No active library members found.</div>}
                    {!isLoadingMembers && libraryMembers.length > 0 && (
                        <DataTable
                            columns={memberColumns}
                            data={libraryMembers}
                            // Implement pagination for DataTable if needed
                        />
                    )}
                </CardBody>
            </Card>
        </Tab>
        <Tab key="search" title={<div className="flex items-center gap-2 py-1"><MagnifyingGlassIcon className="w-5 h-5" /> Search All Users</div>}>
            <Card className="mt-2">
                <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                            <div className="flex rounded-md">
                                <Button variant={userSearchType === 'student' ? 'solid' : 'bordered'} color="secondary" className="rounded-r-none flex-1" onPress={() => {setUserSearchType('student'); setUserSearchTerm(''); setSearchedUsers([]);}}>Student</Button>
                                <Button variant={userSearchType === 'teacher' ? 'solid' : 'bordered'} color="warning" className="rounded-l-none flex-1" onPress={() => {setUserSearchType('teacher'); setUserSearchTerm(''); setSearchedUsers([]);}}>Teacher</Button>
                            </div>
                        </div>
                        <Input
                            label="Search by Name"
                            placeholder="Enter at least 2 characters..."
                            value={userSearchTerm}
                            onValueChange={setUserSearchTerm}
                            variant="bordered" 
                            isClearable 
                            onClear={() => {setUserSearchTerm(''); setSearchedUsers([]);}}
                            className="md:col-span-5" // Adjusted span
                            startContent={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400"/>}
                        />
                    </div>
                    {isLoadingSearch && <div className="text-center py-10 text-gray-500">Searching...</div>}
                    {!isLoadingSearch && userSearchTerm.length >= 2 && searchedUsers.length === 0 && <div className="text-center py-10 text-gray-500">No users found matching your criteria.</div>}
                    {!isLoadingSearch && searchedUsers.length > 0 && (
                        <div className="mt-4 border rounded-md max-h-[60vh] overflow-y-auto">
                            {searchedUsers.map(user => (
                                <div key={user.$id} className="flex items-center justify-between p-3 hover:bg-gray-100 border-b last:border-b-0 cursor-pointer transition-colors" onClick={() => handleUserSelectForDetail(user)}>
                                    <div className="flex items-center space-x-3">
                                        <Avatar name={user.name ? user.name.substring(0,1) : '?'} size="md"/>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name || 'N/A'}</p>
                                            <Chip size="md" variant={user.isLibraryMember ? 'flat' : 'bordered'} color={user.isLibraryMember ? 'success' : 'default'}>
                                                {user.isLibraryMember ? 'Member' : 'Not Member'}
                                            </Chip>
                                        </div>
                                    </div>
                                    <Chip size="md" className="capitalize">{user.type || 'N/A'}</Chip>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>
        </Tab>
      </Tabs>
      {/* <LoadingOverlay isLoading={isLoadingMembers || isLoadingSearch} /> */}
    </div>
  );
};

export default LibraryMemberHubPage;