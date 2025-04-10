import React, { useState } from 'react';
import { Drawer } from '../../components/common/Drawer'; // Assuming Drawer.tsx is in the same directory

// A minimal functional button for the example
const MinimalButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
    <button
        className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${className || 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'}`}
        {...props}
    >
        {children}
    </button>
);


function Test1() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNonDismissableOpen, setIsNonDismissableOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const openNonDismissable = () => setIsNonDismissableOpen(true);
  const closeNonDismissable = () => setIsNonDismissableOpen(false); // Explicit close

  return (
    <div className="p-4 space-x-2">
       <MinimalButton onClick={openDrawer}>
        Open Regular Drawer
      </MinimalButton>

       <MinimalButton onClick={openNonDismissable} className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white">
        Open Non-Dismissable Drawer
      </MinimalButton>

      {/* --- Regular Drawer --- */}
      <Drawer isOpen={isDrawerOpen} onClose={closeDrawer} size="sm">
        <Drawer.Header>
           Regular Drawer
        </Drawer.Header>
        <Drawer.Body>
          <p className="dark:text-gray-300">You can close this by:</p>
          <ul className="list-disc list-inside dark:text-gray-300">
            <li>Clicking the overlay</li>
            <li>Pressing Escape key</li>
            <li>Clicking the 'X' button</li>
            <li>Clicking the 'Close' button below</li>
          </ul>
        </Drawer.Body>
        <Drawer.Footer>
          <MinimalButton
            onClick={closeDrawer}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
           >
             Close
          </MinimalButton>
        </Drawer.Footer>
      </Drawer>


      {/* --- Non-Dismissable Drawer --- */}
      <Drawer
        isOpen={isNonDismissableOpen}
        onClose={closeNonDismissable} 
        nonDismissable={true} 
      >
        <Drawer.Header showCloseButton={true}>
           Title goes here
        </Drawer.Header>
        <Drawer.Body>
         Here body components
        </Drawer.Body>
        <Drawer.Footer>
          Buttom components
        </Drawer.Footer>
      </Drawer>
    </div>
  );
}

export default Test1;