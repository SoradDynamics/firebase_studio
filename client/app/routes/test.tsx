import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Test Layout" }];
};

export default function TestLayout() {
  return (
    <div className="h-screen flex flex-col p-4 bg-gray-100">
      {/* Top Div (Remaining Area) with Scrollbar */}
      <div className="flex-1 bg-white rounded-md shadow-md p-4 space-y-2 overflow-auto">
        <h2 className="text-xl font-semibold">Top Content Area</h2>
        <p className="text-gray-700">
          This div takes up the remaining vertical space. It has padding, rounded
          corners, and a subtle shadow for a professional look. It's also
          responsive and will grow or shrink with the viewport.
        </p>
        <p className="text-gray-700">
          To demonstrate overflow, here is some extra content. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
        {/* Add your top content here */}
      </div>

      {/* Bottom Div (Fixed 20px Height - Now Customizable) with Scrollbar */}
      <div className="h-[90px]  bg-blue-500 text-white rounded-md shadow-md p-2 flex items-center justify-center mt-4 overflow-auto">
        <p className="text-sm">Bottom Fixed Height Area (20px - Adjustable)</p>
        <p className="text-sm ml-2">
          More content to show scrollbar. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        {/* Add your bottom content here */}
      </div>
    </div>
  );
}