// src/utils/dateConverter.ts
import NepaliDate from 'nepali-date-converter';

// Regex for YYYY-MM-DD, YYYY-M-D, YYYY-MM-D, YYYY-M-DD
const isValidDateFormat = (date: string): boolean => /^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])$/.test(date);

export const convertADtoBS = (adDateString?: string | null): string => {
  if (!adDateString) return '-';
  let dateToConvert = adDateString;
  if (adDateString.includes('T')) {
      dateToConvert = adDateString.split('T')[0];
  }

  if (!isValidDateFormat(dateToConvert)) {
    // console.warn("convertADtoBS: Invalid AD Date Format for input:", adDateString);
    return 'Invalid AD Fmt';
  }
  try {
    const [year, month, day] = dateToConvert.split('-').map(Number);
    // Using Date.UTC to avoid local timezone interpretation issues when creating the initial JS Date from parts.
    // The NepaliDate constructor itself likely handles the conversion logic properly from this JS Date.
    const adDate = new Date(Date.UTC(year, month - 1, day)); 
    if (isNaN(adDate.getTime())) {
        // console.warn("convertADtoBS: Invalid AD Date object for input:", adDateString);
        return 'Invalid AD Date';
    }
    const npDate = new NepaliDate(adDate);
    const bsYear = npDate.getYear();
    const bsMonth = String(npDate.getMonth() + 1).padStart(2, '0');
    const bsDay = String(npDate.getDate()).padStart(2, '0');
    return `${bsYear}-${bsMonth}-${bsDay}`;
  } catch (e) {
    console.error("AD to BS Conversion failed for:", adDateString, e);
    return 'Conv. Error';
  }
};

export const convertBStoAD = (bsDateString?: string | null): string | null => {
  if (!bsDateString || !isValidDateFormat(bsDateString)) {
    // console.warn("convertBStoAD: Invalid BS Date Format for input:", bsDateString);
    return null;
  }
  try {
    const [year, month, day] = bsDateString.split('-').map(Number);
    const npDate = new NepaliDate(year, month - 1, day); // NepaliDate month is 0-indexed
    const adDate = npDate.toJsDate();
    if (isNaN(adDate.getTime())) {
        // console.warn("convertBStoAD: Invalid AD Date from BS conversion:", bsDateString);
        return null;
    }
    const adYear = adDate.getFullYear();
    const adMonth = String(adDate.getMonth() + 1).padStart(2, '0');
    const adDay = String(adDate.getDate()).padStart(2, '0');
    return `${adYear}-${adMonth}-${adDay}`;
  } catch (e) {
    console.error("BS to AD Conversion failed for:", bsDateString, e);
    return null;
  }
};

export const getTomorrowADDateString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayADDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getTodayBSDateString = (): string => {
    const todayAD = new Date();
    const npDate = new NepaliDate(todayAD);
    const bsYear = npDate.getYear();
    const bsMonth = String(npDate.getMonth() + 1).padStart(2, '0');
    const bsDay = String(npDate.getDate()).padStart(2, '0');
    return `${bsYear}-${bsMonth}-${bsDay}`;
};