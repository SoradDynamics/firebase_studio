// src/utils/helpers.ts
import { SubjectDetail } from '../types/appwrite.types';

export const parseSubjectDetails = (jsonString: string): SubjectDetail[] => {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.map(subject => ({
        ...subject,
        theoryFM: subject.theoryFM !== null && subject.theoryFM !== undefined ? Number(subject.theoryFM) : 0,
        theoryPM: subject.theoryPM !== null && subject.theoryPM !== undefined ? Number(subject.theoryPM) : 0,
        practicalFM: subject.hasPractical && subject.practicalFM !== null && subject.practicalFM !== undefined ? Number(subject.practicalFM) : null,
        practicalPM: subject.hasPractical && subject.practicalPM !== null && subject.practicalPM !== undefined ? Number(subject.practicalPM) : null,
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to parse subjectDetails_json:", error);
    return [];
  }
};