import React, { useState } from 'react';
import NepaliDate from 'nepali-date-converter';

export default function DateConverter() {
  const [dateType, setDateType] = useState<'AD' | 'BS'>('AD');
  const [inputDate, setInputDate] = useState('');
  const [convertedDate, setConvertedDate] = useState('');
  const [error, setError] = useState('');

  const isValidDateFormat = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

  const handleConvert = () => {
    setError('');
    setConvertedDate('');

    if (!isValidDateFormat(inputDate)) {
      setError('❌ Date must be in YYYY-MM-DD format.');
      return;
    }

    const [year, month, day] = inputDate.split('-').map(Number);

    try {
      if (dateType === 'AD') {
        const adDate = new Date(year, month - 1, day);
        const npDate = new NepaliDate(adDate);
        const bsYear = npDate.getYear();
        const bsMonth = String(npDate.getMonth() + 1).padStart(2, '0');
        const bsDay = String(npDate.getDate()).padStart(2, '0');
        setConvertedDate(`${bsYear}-${bsMonth}-${bsDay}`);
      } else {
        const npDate = new NepaliDate(year, month - 1, day);
        const adDate = npDate.toJsDate();
        const adYear = adDate.getFullYear();
        const adMonth = String(adDate.getMonth() + 1).padStart(2, '0');
        const adDay = String(adDate.getDate()).padStart(2, '0');
        setConvertedDate(`${adYear}-${adMonth}-${adDay}`);
      }
    } catch (e) {
      setError('❌ Conversion failed. Please enter a valid date within the supported range.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg space-y-6">
      <h1 className="text-xl font-bold text-center">📅 BS ⇄ AD Converter</h1>

      <div className="flex justify-center gap-4">
        <button
          className={`px-4 py-2 rounded ${dateType === 'AD' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => {
            setDateType('AD');
            setInputDate('');
            setConvertedDate('');
            setError('');
          }}
        >
          AD ➝ BS
        </button>
        <button
          className={`px-4 py-2 rounded ${dateType === 'BS' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          onClick={() => {
            setDateType('BS');
            setInputDate('');
            setConvertedDate('');
            setError('');
          }}
        >
          BS ➝ AD
        </button>
      </div>

      <div>
        <label className="block font-medium mb-1">
          Enter {dateType} Date (YYYY-MM-DD)
        </label>
        <input
          type="text"
          className="w-full border px-3 py-2 rounded mb-2"
          placeholder={dateType === 'AD' ? '2024-04-15' : '2081-01-03'}
          value={inputDate}
          onChange={(e) => setInputDate(e.target.value)}
        />
        <button
          onClick={handleConvert}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Convert
        </button>
      </div>

      {convertedDate && (
        <div className="text-center text-green-700 font-semibold">
          ✅ Converted Date: {convertedDate}
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
