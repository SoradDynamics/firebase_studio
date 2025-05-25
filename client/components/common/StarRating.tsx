// StarRating.tsx
import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";

type StarRatingProps = {
  rating?: number;
  max?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  color?: string;
  hoverColor?: string;
};

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  max = 5,
  onRatingChange,
  size = 28,
  color = "#fbbf24",       // amber-400
  hoverColor = "#fde68a",  // amber-200
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState(rating);
  const [hoverDisabled, setHoverDisabled] = useState(false);

  useEffect(() => {
    setSelected(rating);
    setHoverDisabled(false); // reset if parent changes rating
  }, [rating]);

  const handleClick = (index: number) => {
    setSelected(index);
    setHoverDisabled(true); // disable hover after click
    onRatingChange?.(index);
  };

  const displayRating = hoverDisabled
    ? selected
    : hovered !== null
    ? hovered
    : selected;

  return (
    <div className="flex space-x-1">
      {Array.from({ length: max }, (_, i) => {
        const starIndex = i + 1;
        const isActive = starIndex <= displayRating;

        return (
          <Star
            key={i}
            size={size}
            className={`
              cursor-pointer transition-all duration-200
              ${isActive ? "scale-110" : ""}
              ${isActive && !hoverDisabled && hovered !== null ? "text-amber-200" : isActive ? "text-amber-400" : "text-gray-300"}
              active:scale-125
            `}
            // onMouseEnter={() => !hoverDisabled && setHovered(starIndex)}
            // onMouseLeave={() => !hoverDisabled && setHovered(null)}
            onClick={() => handleClick(starIndex)}
            style={{
              fill: isActive
                ? !hoverDisabled && hovered !== null
                  ? hoverColor
                  : color
                : "none",
            }}
          />
        );
      })}
    </div>
  );
};
