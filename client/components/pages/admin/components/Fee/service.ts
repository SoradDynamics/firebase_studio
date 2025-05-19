// src/appwrite/service.ts
import { databases, ID, Query, APPWRITE_DATABASE_ID, FACULTIES_COLLECTION_ID, FEES_CONFIG_COLLECTION_ID } from '~/utils/appwrite'; // Removed SECTIONS_COLLECTION_ID
import type { Faculty, FeeConfigDocument, FeeItem, ProcessedFeeConfig } from 'types/fee-config';

// --- Helper Functions ---
export const parseFeeDesc = (desc: string[]): FeeItem[] => {
  return desc.map((item, index) => {
    const parts = item.split(':');
    return {
      id: `fee-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      title: parts[0]?.trim() || '',
      amount: parts[1] ? Number(parts[1]) : 0,
    };
  });
};

export const serializeFeeItems = (items: FeeItem[]): string[] => {
  return items.map(item => `${item.title.trim()}:${item.amount}`);
};


// --- Faculty Service ---
export const getFaculties = async (): Promise<Faculty[]> => {
  try {
    // Ensure your Faculty type in Appwrite/SDK matches what's fetched.
    // By default, listDocuments fetches all attributes.
    const response = await databases.listDocuments<Faculty>(
      APPWRITE_DATABASE_ID,
      FACULTIES_COLLECTION_ID,
      [Query.limit(100)] // Add pagination if you have many faculties
    );
    return response.documents;
  } catch (error) {
    console.error("Failed to fetch faculties:", error);
    throw error;
  }
};

// --- Fee Configuration Service ---

// Fetches ALL fee configurations for a GIVEN faculty.
// Useful to get all configs at once and then map them on the client.
export const getFeeConfigsByFaculty = async (facultyId: string): Promise<FeeConfigDocument[]> => {
    try {
        const response = await databases.listDocuments<FeeConfigDocument>(
            APPWRITE_DATABASE_ID,
            FEES_CONFIG_COLLECTION_ID,
            [Query.equal('facultyId', facultyId), Query.limit(100)] // Adjust limit if a faculty can have >100 class fee configs
        );
        return response.documents;
    } catch (error) {
        console.error("Failed to fetch fee configurations by faculty:", error);
        throw error;
    }
};

// Fetches a SPECIFIC fee configuration for a faculty and class.
// This is used by the drawer when editing to ensure we have the latest.
export const getFeeConfiguration = async (facultyId: string, className: string): Promise<FeeConfigDocument | null> => {
  try {
    const response = await databases.listDocuments<FeeConfigDocument>(
      APPWRITE_DATABASE_ID,
      FEES_CONFIG_COLLECTION_ID,
      [
        Query.equal('facultyId', facultyId),
        Query.equal('className', className),
        Query.limit(1)
      ]
    );
    return response.documents[0] || null;
  } catch (error) {
    console.error(`Failed to fetch fee configuration for ${facultyId} - ${className}:`, error);
    // If it's a 404, it's fine, means not found. Otherwise, rethrow.
    if ((error as any)?.response?.status === 404 || (error as any)?.code === 404) {
        return null;
    }
    throw error;
  }
};

export const createFeeConfiguration = async (data: Omit<FeeConfigDocument, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>): Promise<FeeConfigDocument> => {
  try {
    // Before creating, you might want to double-check if it exists to avoid race conditions,
    // though the unique index on (facultyId, className) should prevent duplicates at DB level.
    // const existing = await getFeeConfiguration(data.facultyId, data.className);
    // if (existing) {
    //   throw new Error(`Fee configuration already exists for ${data.facultyId} - ${data.className}. Use update instead.`);
    // }
    const response = await databases.createDocument<FeeConfigDocument>(
      APPWRITE_DATABASE_ID,
      FEES_CONFIG_COLLECTION_ID,
      ID.unique(),
      data
    );
    return response;
  } catch (error) {
    console.error("Failed to create fee configuration:", error);
    throw error;
  }
};

export const updateFeeConfiguration = async (docId: string, data: Partial<Pick<FeeConfigDocument, 'desc'>>): Promise<FeeConfigDocument> => {
  try {
    const response = await databases.updateDocument<FeeConfigDocument>(
      APPWRITE_DATABASE_ID,
      FEES_CONFIG_COLLECTION_ID,
      docId,
      data
    );
    return response;
  } catch (error) {
    console.error("Failed to update fee configuration:", error);
    throw error;
  }
};

export const deleteFeeConfiguration = async (docId: string): Promise<void> => {
  try {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      FEES_CONFIG_COLLECTION_ID,
      docId
    );
  } catch (error) {
    console.error("Failed to delete fee configuration:", error);
    throw error;
  }
};