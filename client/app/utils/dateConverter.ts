// @/utils/dateConverter.ts
import NepaliDate from 'nepali-date-converter';

/**
 * Converts an AD date string (accepts YYYY-MM-DD or YYYY/M/D) to a BS date string (YYYY-MM-DD).
 * Returns an empty string on error or invalid input.
 */
export const convertAdToBs = (adDateStr: string | undefined | null): string => {
  if (!adDateStr) return '';
  try {
    const adDate = new Date(adDateStr); // JS Date constructor is flexible with YYYY-MM-DD and YYYY/M/D
    if (isNaN(adDate.getTime())) {
        console.warn(`Invalid AD date for BS conversion: ${adDateStr}`);
        return '';
    }
    const npDate = new NepaliDate(adDate);
    return npDate.format('YYYY-MM-DD');
  } catch (e) {
    console.error(`Error converting AD '${adDateStr}' to BS:`, e);
    return '';
  }
};

/**
 * Converts a BS date string (YYYY-MM-DD) to an AD date string (YYYY-MM-DD).
 * Returns null on error or invalid input.
 */
export const convertBsToAd = (bsDateStr: string | undefined | null): string | null => {
  if (!bsDateStr) return null;
  try {
    // NepaliDate constructor expects (year, monthIndex (0-11), day)
    const [year, month, day] = bsDateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 32) {
        console.warn(`Invalid BS date format for AD conversion: ${bsDateStr}`);
        return null;
    }
    const npDate = new NepaliDate(year, month - 1, day);
    const adDate = npDate.toJsDate();
    if (isNaN(adDate.getTime())) {
        console.warn(`BS to AD conversion resulted in invalid JS Date: ${bsDateStr}`);
        return null;
    }
    return `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, '0')}-${String(adDate.getDate()).padStart(2, '0')}`;
  } catch (e) {
    console.error(`Error converting BS '${bsDateStr}' to AD:`, e);
    return null;
  }
};

/**
 * Converts a BS date string (YYYY-MM-DD) to a JavaScript Date object.
 * Returns null on error.
 */
export const convertBsToAdDateObject = (bsDateStr: string | undefined | null): Date | null => {
    if (!bsDateStr) return null;
    try {
      const [year, month, day] = bsDateStr.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 32) return null;
      const npDate = new NepaliDate(year, month - 1, day);
      const adJsDate = npDate.toJsDate();
      if (isNaN(adJsDate.getTime())) return null;
      return adJsDate;
    } catch (e) {
      console.error(`Error converting BS '${bsDateStr}' to Date object:`, e);
      return null;
    }
};


/**
 * Generates an array of AD date strings (YYYY-MM-DD) between two AD date strings (inclusive).
 * Input dates should be in a format parseable by new Date().
 */
export const getAdDatesInRange = (startDateAdStr: string, endDateAdStr: string): string[] => {
    const dates: string[] = [];
    try {
        let currentDate = new Date(startDateAdStr);
        // Normalize to UTC start of day to avoid timezone issues with date iteration
        currentDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));

        const endDate = new Date(endDateAdStr);
        const finalEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()));


        if (isNaN(currentDate.getTime()) || isNaN(finalEndDate.getTime())) {
            console.warn("Invalid start or end date for range generation", {startDateAdStr, endDateAdStr});
            return [];
        }

        while (currentDate.getTime() <= finalEndDate.getTime()) {
            dates.push(`${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
    } catch (e) {
        console.error("Error generating AD dates in range:", {startDateAdStr, endDateAdStr}, e);
    }
    return dates;
};