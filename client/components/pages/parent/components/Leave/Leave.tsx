import React from 'react'
import SelectStudentComponent from '../Select/SelectStudent'
import DisplayStudentComponent from '../Select/DisplayStudentRecords'
import LeaveValidate from './LeaveValidate'

const Leave = () => {
  return (
    <div className=' overflow-hidden'>
         <div className="container  h-full overflow-hidden p-3 pl-5">
        {/* <h1 className="text-3xl font-bold text-gray-800 mb-8">Parent Dashboard</h1> */}

        {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"> */}
          {/* <div className="lg:col-span-1"> */}
             <SelectStudentComponent />
          {/* </div> */}
          {/* <div className="lg:col-span-2">
            <DisplayStudentComponent />
          </div> */}
        {/* </div> */}

        {/* Leave Validation Section */}
        {/* <div className="mt-8"> */}
          <LeaveValidate />
        {/* </div> */}

      </div>
    </div>
  )
}

export default Leave