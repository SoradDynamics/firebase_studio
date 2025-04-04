// components/MobileNavMenu.tsx
import React from "react";

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  onClick: () => void;
  // isCenter?: boolean; // New property to identify the center item
  // centerText?: string; // Optional text for the center item
}

interface MobileNavMenuProps {
  menuItems: MenuItem[];
  activeItemName: string;
  setActiveItemName: (name: string) => void;
}

const MobileNavMenu: React.FC<MobileNavMenuProps> = ({
  menuItems,
  activeItemName,
  setActiveItemName,
}) => {
  return (
    // <div className="fixed inset-x-0 bottom-0 bg-gray-100 border-t border-gray-200 md:hidden"> {/* Changed background to light gray */}
    // <div className="h-[90px]  bg-blue-500 text-white rounded-md shadow-md p-2 flex items-center justify-center mt-2 overflow-auto">

    <nav className=" flex justify-evenly ">
      {menuItems.map((item, index) => {
        const isItemSelected = item.name === activeItemName;
        // const isCenterItem = item.isCenter;

        return (
          <button
            key={index}
            onClick={() =>{  item.onClick; setActiveItemName(item.name);}}
            className={`flex flex-col items-center justify-evenly pt-2  rounded-md text-gray-500 focus:outline-none                `}
            // above brackets if needed 1 line above {/*  ${isCenterItem ? 'relative -mt-8' : ''}  Raise center button */}
            aria-label={item.name}
            // style={${isItemSelected ? }}}
            style={{ color: isItemSelected ? '#3B82F6' : '' }}
            type="button"
          >
            {/* {isCenterItem ? (
                <div className=" absolute mb-8">
                  <div className="absolute -inset-1 bg-gradient-to-br from-pink-500 to-red-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-200 group-hover:duration-200"></div>
                  <div className="relative px-5 py-3 bg-gray-100 shadow-md rounded-xl flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)' }}> 
                     <span className="text-white font-bold">{item.centerText}</span> 
                  </div>
                </div>
              ) : ( */}
            <>
              {item.icon}
              <span className="text-xs my-1 font-medium">{item.name}</span>
              {isItemSelected && (
                <div className="bottom-0 h-[4px] mb-[1px] rounded-large mt-0.5 w-full bg-blue-500 rounded-t-md"></div>
              )}
            </>
            {/* // )} */}
          </button>
        );
      })}
    </nav>
    // </div>
  );
};

export default MobileNavMenu;
