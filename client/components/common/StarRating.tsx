import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";

type StarRatingProps = {
  rating?: number;
  max?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  color?: string;
  hoverColor?: string;
  readOnly?: boolean; // <<< NEW PROP
};

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  max = 5,
  onRatingChange,
  size = 28,
  color = "#fbbf24",       // amber-400 (default for interactive)
  hoverColor = "#fde68a",  // amber-200 (default for interactive)
  readOnly = false,       // Default to interactive
}) => {
  const [currentRating, setCurrentRating] = useState(rating); // Internal state for display
  const [hovered, setHovered] = useState<number | null>(null);
  // hoverDisabled state is not strictly needed if click is disabled by readOnly

  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  const handleClick = (index: number) => {
    if (readOnly || !onRatingChange) return; // Ignore click if readOnly or no handler
    setCurrentRating(index); // Update visual immediately for responsiveness if desired
    onRatingChange(index);
  };

  const handleMouseEnter = (index: number) => {
    if (readOnly) return;
    setHovered(index);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHovered(null);
  };

  // Determine fill color based on readOnly and hover state
  const getFillColor = (isActive: boolean) => {
    if (isActive) {
      if (!readOnly && hovered !== null) {
        return hoverColor; // Hover effect only if interactive
      }
      return color; // Selected color
    }
    return "none"; // Not selected
  };
  
  // Determine text color (stroke)
  const getTextColor = (isActive: boolean) => {
    if (isActive) {
        if (!readOnly && hovered !== null) {
            return "text-amber-200"; // Lighter for hover when interactive
        }
        return "text-amber-400"; // Default active color (using Tailwind classes directly here)
    }
    return "text-gray-300"; // Default inactive color
  };


  return (
    <div className={`flex space-x-1 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
      {Array.from({ length: max }, (_, i) => {
        const starIndex = i + 1;
        // For display, always use currentRating. Hover affects visual only if not readOnly.
        const displayValue = readOnly ? currentRating : (hovered !== null ? hovered : currentRating);
        const isActive = starIndex <= displayValue;

        return (
          <Star
            key={i}
            size={size}
            className={`
              transition-colors duration-150 
              ${!readOnly && isActive ? "scale-110" : ""} 
              ${!readOnly ? "active:scale-125" : ""}
              ${getTextColor(isActive)}
            `}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starIndex)}
            style={{
              fill: getFillColor(isActive),
            }}
          />
        );
      })}
    </div>
  );
};