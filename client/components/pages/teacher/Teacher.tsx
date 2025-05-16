import React from 'react'
import Navbar from './Navbar'
import { NotificationProvider } from '../common/NotificationContext'
import { TeacherProvider } from './components/TeacherContext'
import { StudentProvider } from '../student/components/StudentContext'

const Teacher = () => {
  return (
            // <StudentProvider>
    <NotificationProvider>
        <TeacherProvider>
    <div>
        <Navbar toggleSidebar={function (): void {
              throw new Error('Function not implemented.')
          } }/>
    </div>

    </TeacherProvider>
    </NotificationProvider>
    // </StudentProvider>
  )
}

export default Teacher