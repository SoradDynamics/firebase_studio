// app/routes/test2.tsx
import { useState } from 'react';

export default function Test2() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar state for mobile responsiveness

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar (visible on larger screens, togglable on smaller screens) */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-md w-64 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 z-20`} // lg:translate-x-0 makes it always visible on larger screens
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-white">
          {/* Sidebar Header/Branding */}
          <div className="flex items-center justify-center mb-8">
            <span className="font-semibold text-xl text-gray-800">
              Modern Dashboard
            </span>
          </div>
          {/* Sidebar Navigation */}
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 text-gray-500 group-hover:text-gray-900"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 00-1 1v3a1 1 0 102 0V10a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-3">Dashboard</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
                <span className="ml-3">Products</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-3">Customers</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm7.707 3.293a1 1 0 00-1.414 1.414L9.586 9H7a1 1 0 00-1 1v2a1 1 0 001 1h2.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-3">Analytics</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1.5a.5.5 0 011 0V13h4.5a.5.5 0 010 1H5zm7.5.5a.5.5 0 00.5-.5V13h2a.5.5 0 000-1H13v1.5a.5.5 0 00.5.5h1.5a.5.5 0 000-1H15v-2a.5.5 0 00-.5-.5H9.5a.5.5 0 00.5.5v4a.5.5 0 00-.5.5H8a.5.5 0 00.5-.5v-2H5.5a.5.5 0 00-.5.5V13h-1a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-3">Settings</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Navbar */}
        <nav className="bg-white border-b border-gray-200 fixed top-0 w-full lg:pl-64 z-10">
          <div className="px-4 py-2.5 lg:px-6">
            <div className="flex items-center justify-between">
              {/* Mobile Sidebar Toggle Button */}
              <div className="flex items-center">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  data-drawer-target="sidebar-navigation"
                  data-drawer-toggle="sidebar-navigation"
                  aria-controls="sidebar-navigation"
                  type="button"
                  className="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg
                    className="w-6 h-6"
                    aria-hidden="true"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clipRule="evenodd"
                      fillRule="evenodd"
                      d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
                    ></path>
                  </svg>
                </button>
                <span className="self-center text-xl font-semibold sm:text-2xl whitespace-nowrap text-gray-800 ml-2">
                  Dashboard
                </span>
              </div>

              {/* Navbar Right Side (Profile, etc.) */}
              <div className="flex items-center space-x-4">
                {/* Placeholder User Profile */}
                <div className="hidden sm:flex items-center">
                  <span className="mr-2 text-sm font-semibold text-gray-700">
                    John Doe
                  </span>
                  <img
                    className="w-8 h-8 rounded-full"
                    src="https://via.placeholder.com/50" // Replace with actual user image
                    alt="user avatar"
                  />
                </div>
                {/* Add more navbar items here if needed */}
              </div>
            </div>
          </div>
        </nav>

        {/* Content Body */}
        <div className="p-4 lg:p-6 mt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h5 className="mb-2 text-2xl font-semibold text-gray-700">
                Card 1
              </h5>
              <p className="mb-3 text-gray-500">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h5 className="mb-2 text-2xl font-semibold text-gray-700">
                Card 2
              </h5>
              <p className="mb-3 text-gray-500">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h5 className="mb-2 text-2xl font-semibold text-gray-700">
                Card 3
              </h5>
              <p className="mb-3 text-gray-500">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <h5 className="mb-2 text-2xl font-semibold text-gray-700">
              Content Area
            </h5>
            <p className="mb-3 text-gray-500">
              This is the main content area of your dashboard. You can place various components, charts, tables, and widgets here.
            </p>
            {/* Add more content here */}
          </div>
        </div>
      </div>
    </div>
  );
}