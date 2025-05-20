// src/utils/dateUtils.ts
import NepaliDate from 'nepali-date-converter';

/**
 * Normalizes various date string formats (YYYY/M/D, YYYY-M-D, YYYY/MM/DD, YYYY-MM-DD)
 * to "YYYY-MM-DD" format.
 * @param dateStr The date string to normalize.
 * @returns Normalized date string in "YYYY-MM-DD" format, or null if input is invalid.
 */
export const normalizeToYYYYMMDD = (dateStr: string | undefined | null): string | null => {
    if (!dateStr) return null;
    const trimmedDateStr = dateStr.trim();
    
    // Regex to capture YYYY, M(M), D(D) with either / or - as separator
    const match = trimmedDateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    
    if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    // console.warn(`Could not normalize date string: "${dateStr}" to YYYY-MM-DD`);
    return null;
};

/**
 * Converts an AD date string to a BS date string.
 * @param adDateString AD date string (e.g., "2024-04-15", "2024/4/15").
 * @returns BS date string in "YYYY-MM-DD" format, or null on error.
 */
export const convertAdToBs = (adDateString: string): string | null => {
  try {
    const normalizedAd = normalizeToYYYYMMDD(adDateString);
    if (!normalizedAd) {
        // console.error(`Invalid AD date format for conversion: ${adDateString}`);
        return null;
    }

    const [year, month, day] = normalizedAd.split('-').map(Number);
    const adJsDate = new Date(year, month - 1, day); // JS Date month is 0-indexed

    if (isNaN(adJsDate.getTime())) {
        // console.error(`Parsed AD Date is invalid: ${adJsDate} from ${normalizedAd}`);
        return null;
    }

    const npDate = new NepaliDate(adJsDate);
    const bsYear = npDate.getYear();
    const bsMonth = String(npDate.getMonth() + 1).padStart(2, '0'); // NepaliDate month is 0-indexed
    const bsDay = String(npDate.getDate()).padStart(2, '0');
    
    return `${bsYear}-${bsMonth}-${bsDay}`;
  } catch (error) {
    // console.error(`Error converting AD "${adDateString}" to BS:`, error);
    return null;
  }
};

/**
 * Converts a BS date string to an AD date string.
 * @param bsDateString BS date string (e.g., "2081-01-03", "2081/1/3").
 * @returns AD date string in "YYYY-MM-DD" format, or null on error.
 */
export const convertBsToAd = (bsDateString: string): string | null => {
  try {
    const normalizedBs = normalizeToYYYYMMDD(bsDateString);
    if (!normalizedBs) {
        // console.error(`Invalid BS date format for conversion: ${bsDateString}`);
        return null;
    }

    const [year, month, day] = normalizedBs.split('-').map(Number);
    
    // NepaliDate constructor takes (year, month (0-11), day)
    const npDate = new NepaliDate(year, month - 1, day); 
    const adJsDate = npDate.toJsDate();

    if (isNaN(adJsDate.getTime())) {
        // console.error(`Parsed BS Date is invalid for AD conversion: ${normalizedBs}`);
        return null;
    }

    const adYear = adJsDate.getFullYear();
    const adMonth = String(adJsDate.getMonth() + 1).padStart(2, '0'); // JS Date month is 0-indexed
    const adDay = String(adJsDate.getDate()).padStart(2, '0');
    
    return `${adYear}-${adMonth}-${adDay}`;
  } catch (error) {
    // console.error(`Error converting BS "${bsDateString}" to AD:`, error);
    return null;
  }
};

/**
 * Generates an array of AD date strings (YYYY-MM-DD) within a given range (inclusive).
 * @param startDateAD Start AD date string ("YYYY-MM-DD").
 * @param endDateAD End AD date string ("YYYY-MM-DD").
 * @returns Array of AD date strings.
 */
export const getDatesInRangeAD = (startDateAD: string, endDateAD: string): string[] => {
  const dates: string[] = [];
  const normStartAD = normalizeToYYYYMMDD(startDateAD);
  const normEndAD = normalizeToYYYYMMDD(endDateAD);

  if (!normStartAD || !normEndAD) {
    // console.error("getDatesInRangeAD: Invalid start or end date format for range generation.");
    return dates;
  }

  let currentDateObj = new Date(normStartAD.replace(/-/g, '/')); // Use / for broader compatibility with Date constructor
  let endDateObj = new Date(normEndAD.replace(/-/g, '/'));
  
  // Ensure dates are UTC to avoid timezone issues if just iterating by day
  currentDateObj = new Date(Date.UTC(currentDateObj.getUTCFullYear(), currentDateObj.getUTCMonth(), currentDateObj.getUTCDate()));
  endDateObj = new Date(Date.UTC(endDateObj.getUTCFullYear(), endDateObj.getUTCMonth(), endDateObj.getUTCDate()));


  if (isNaN(currentDateObj.getTime()) || isNaN(endDateObj.getTime()) || currentDateObj > endDateObj) {
    // console.error("getDatesInRangeAD: Invalid date objects or start date is after end date.");
    return dates;
  }

  while (currentDateObj <= endDateObj) {
    const year = currentDateObj.getUTCFullYear();
    const month = (currentDateObj.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = currentDateObj.getUTCDate().toString().padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    currentDateObj.setUTCDate(currentDateObj.getUTCDate() + 1);
  }
  return dates;
};


export const nepaliMonthNames = [
  "बैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "आश्विन",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र",
];

export const getNepaliMonthName = (monthNumber: number): string => {
    return nepaliMonthNames[monthNumber - 1] || "Unknown";
};