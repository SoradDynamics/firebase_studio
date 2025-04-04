{/* Menu.tsx */}
import React from "react";
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface MenuItem {
    name: string;
    icon: React.ReactNode;
    onClick: () => void;
    subMenu?: MenuItem[];
    isSubMenuOpen?: boolean;
    onSubMenuItemClick?: (name: string) => void;
}

interface MenuProps {
    menuItems: MenuItem[];
    selectedMenuItemName: string | null;
    expandedSubMenus: string[];
}

const Menu: React.FC<MenuProps> = ({ menuItems, selectedMenuItemName, expandedSubMenus }) => {
    return (
        <div className="w-full px-2 sm:px-4 md:px-6">
            <div className="mx-auto max-w-3xl mt-3 rounded-full lg:max-w-xl">
                <nav className="flex flex-col justify-start rounded-xl p-2 shadow-md border border-gray-200 overflow-hidden bg-gray-50/50"> {/* White background for light theme */}
                    {menuItems.map((item, index) => (
                        <React.Fragment key={index}>
                            <button
                                onClick={item.onClick}
                                className={`group relative flex items-center px-5 gap-3 py-3 w-full text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 justify-start 
                              ${item.name === selectedMenuItemName
                                        ? "bg-indigo-500 text-white shadow-md hover:bg-indigo-600"
                                        : "text-gray-800 hover:bg-gray-50"
                                    }
                                          border-b-1.5

                                    first:rounded-t-lg last:rounded-b-lg
                              ${item.subMenu ? 'justify-between' : ''} `}
                                aria-current={item.name === selectedMenuItemName ? "page" : undefined}
                                style={{ borderBottom: index === menuItems.length - 1 ? 'none' : undefined }} // Conditionally remove bottom border of last item using style
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-lg text-gray-600 group-hover:text-gray-700 ${item.name === selectedMenuItemName ? 'text-white' : ''} transition-colors duration-200`}>{item.icon}</span>
                                    <span className={`text-base ${item.name === selectedMenuItemName ? 'font-semibold text-white' : 'font-medium text-gray-800 group-hover:text-gray-900'} transition-colors duration-200`}>{item.name}</span>
                                </div>
                                {item.subMenu && (
                                    <span>
                                        {expandedSubMenus.includes(item.name) ? (
                                            <ChevronUpIcon className="h-5 w-5 text-gray-600 group-hover:text-gray-700 transition-colors duration-200" />
                                        ) : (
                                            <ChevronDownIcon className="h-5 w-5 text-gray-600 group-hover:text-gray-700 transition-colors duration-200" />
                                        )}
                                    </span>
                                )}

                                {item.name === selectedMenuItemName && (
                                    <span className="absolute left-0 inset-y-0 w-1 bg-indigo-500 rounded-r-md" aria-hidden="true" />
                                )}
                            </button>
                            {item.subMenu && expandedSubMenus.includes(item.name) && (
                                <div className=" pl-8 pr-2">
                                    {item.subMenu.map((subItem, subIndex) => (
                                        <button
                                            key={subIndex}
                                            onClick={() => {
                                                if (item.onSubMenuItemClick) {
                                                    item.onSubMenuItemClick(subItem.name);
                                                }
                                            }}
                                            className={`group relative flex items-center px-5 gap-3 py-3 w-full text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 justify-start
                                          ${subItem.name === selectedMenuItemName
                                                    ? "bg-indigo-500 text-white shadow-md hover:bg-indigo-600"
                                                    : "text-gray-700 hover:bg-gray-50"
                                                }

                                            border-b-1

                                                first:rounded-t-lg last:rounded-b-lg`}
                                        >
                                            <span className={`text-lg text-gray-600 group-hover:text-gray-700 ${subItem.name === selectedMenuItemName ? 'text-white' : ''} transition-colors duration-200`}>{subItem.icon}</span>
                                            <span className={`text-base ${subItem.name === selectedMenuItemName ? 'font-semibold text-white' : 'font-medium text-gray-800 group-hover:text-gray-900'} transition-colors duration-200`}>{subItem.name}</span>
                                            {subItem.name === selectedMenuItemName && (
                                                <span className="absolute left-0 inset-y-0 w-1 bg-indigo-500 rounded-r-md" aria-hidden="true" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default Menu;