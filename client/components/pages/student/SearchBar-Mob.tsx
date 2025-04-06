{/* Searchbar.tsx */}
"use client";

import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { searchItems, SearchItem } from "./searchItems-Mob";
import { Input } from "@heroui/input";

interface SearchBarProps {
  setActiveItem: (item: string, generalMenuItem?: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ setActiveItem }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const filteredResults = query
    ? searchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (item: SearchItem) => {
    setActiveItem(item.location, item.generalMenuLocation);
    setQuery("");
  };

  return (
    <div className="flex items-center justify-center w-full px-4 py-2">
      <div className="relative w-full max-w-md">
        {/* Search Input */}
        <Input
          ref={inputRef}
          placeholder="Search..."
          startContent={
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          }
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full shadow-black shadow-large text-gray-800 border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Search Results */}
        {query.trim() !== "" && (
          <div className="absolute left-0 right-0 z-10 mt-2 bg-gray-50/50 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredResults.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredResults.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 text-blue-500 transition-all" //text blue for icon color
                    onClick={() => handleSelect(item)}
                  >
                    <item.icon className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
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
              <div className="px-4 py-3 text-sm text-gray-500">
                No results found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;