"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { searchItems, SearchItem } from "./searchItems";
import { Input } from "@heroui/input";

interface SearchBarProps {
  setActiveItem: (item: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ setActiveItem }) => {
  const [query, setQuery] = useState("");

  const filteredResults = query
    ? searchItems.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (item: SearchItem) => {
    setActiveItem(item.location); // Pass the location of the selected item
    setQuery(""); // Clear the search input
  };

  return (
    <div className="relative flex-col w-full max-w-lg mx-auto flex items-center">
      <Input
        placeholder="Search"
        startContent={
          <MagnifyingGlassIcon className="w-5 h-5 text-default-400 pointer-events-none flex-shrink-0" />
        }
        type="text"
        isClearable
        variant="flat"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")} // Handle clearing the input
        className="shadow-gray-600/10 hover:shadow-gray-300/10 bg-slate-200 shadow-md rounded-xl"
      />

      {query.trim() !== "" && (
        <div className="results z-10 mt-12 absolute w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredResults.length > 0 ? (
            <ul>
              {filteredResults.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer text-blue-500 hover:bg-gray-100" //text blue for icon color
                  onClick={() => handleSelect(item)}
                >
                  <item.icon className="w-6 h-6 text-blue-500"/>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.description}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              No results found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
