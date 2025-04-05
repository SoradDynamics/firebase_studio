import { useEffect, useState } from "react";
import {
  Client,
  Account,
  Databases,
  Models,
  Query,
} from "appwrite";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

// Appwrite config
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = "coll-student";

type Student = Models.Document & {
  name: string;
  class: string;  
  section: string;
  stdEmail: string;
  absent: string[];
};

export const StudentNotification = () => {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await account.get();
        const email = user.email;

        const res = await databases.listDocuments<Student>(
          databaseId,
          collectionId,
          [Query.equal("stdEmail", email)]
        );

        if (!res.documents.length) {
          console.warn("No student found with this email");
          return;
        }

        const studentDoc = res.documents[0];
        setStudent(studentDoc);

        const storageKey = `absent_${studentDoc.$id}`;
        const knownAbsences: string[] = JSON.parse(localStorage.getItem(storageKey) || "[]");

        const unseenAbsences = studentDoc.absent.filter(date => !knownAbsences.includes(date));
        for (const date of unseenAbsences) {
          await notifyAbsent(studentDoc.name, date);
        }

        localStorage.setItem(storageKey, JSON.stringify(studentDoc.absent));

        const unsubscribe = client.subscribe(
          [`databases.${databaseId}.collections.${collectionId}.documents.${studentDoc.$id}`],
          async (response) => {
            const events = response.events;
            if (events.some(e => e.includes("update"))) {
              const updated = response.payload as Student;
              const updatedStorageKey = `absent_${updated.$id}`;
              const storedAbsents: string[] = JSON.parse(localStorage.getItem(updatedStorageKey) || "[]");

              const newAbsences = updated.absent.filter(date => !storedAbsents.includes(date));
              for (const date of newAbsences) {
                await notifyAbsent(updated.name, date);
              }

              localStorage.setItem(updatedStorageKey, JSON.stringify(updated.absent));
              setStudent(updated); // update UI
            }
          }
        );

        return () => unsubscribe();
      } catch (err) {
        console.error("Error initializing student subscription:", err);
      }
    };

    init();
  }, []);

  const notifyAbsent = async (name: string, date: string) => {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }

    if (granted && date) {
      await sendNotification({
        title: "🚨 Absence Alert",
        body: `${name} was marked absent on ${date}`,
      });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">📋 Absence History</h2>

      {!student ? (
        <p className="text-center text-gray-500">Loading student data...</p>
      ) : (
        <div>
          <p className="font-semibold text-lg">{student.name}</p>
          <p className="text-sm text-gray-600 mb-2">
            Class {student.class} - Section {student.section}
          </p>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
            {student.absent.length ? (
              student.absent.map((date, i) => <li key={i}>{date}</li>)
            ) : (
              <li>No absences recorded ✅</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
