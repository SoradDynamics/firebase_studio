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

// Appwrite setup
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const parentCollectionId = "coll-parent";
const studentCollectionId = "coll-student";

type Parent = Models.Document & {
  name: string;
  email: string;
  students: string[]; // student document IDs
};

type Student = Models.Document & {
  name: string;
  class: string;
  section: string;
  stdEmail: string;
  absent: string[]; // array of dates
};

export const ParentNotification = () => {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Get logged-in user
        const user = await account.get();
        const email = user.email;

        // 2. Find parent by email
        const parentRes = await databases.listDocuments<Parent>(
          databaseId,
          parentCollectionId,
          [Query.equal("email", email)]
        );

        if (parentRes.documents.length === 0) {
          console.warn("No parent document found for this email.");
          return;
        }

        const parent = parentRes.documents[0];
        const studentIds = parent.students;

        if (!studentIds.length) {
          console.warn("No students linked to this parent.");
          return;
        }

        // 3. Fetch each student and handle unseen absences
        const fetchedStudents: Student[] = [];

        for (const id of studentIds) {
          const student = await databases.getDocument<Student>(
            databaseId,
            studentCollectionId,
            id
          );

          // 🔁 Load known absence dates from localStorage
          const storageKey = `absent_${student.$id}`;
          const knownAbsences: string[] = JSON.parse(
            localStorage.getItem(storageKey) || "[]"
          );

          // 🔍 Check for unseen absences
          const unseen = student.absent.filter(
            (date) => !knownAbsences.includes(date)
          );

          // 🔔 Notify for unseen absences
          for (const date of unseen) {
            await notifyAbsent(student.name, date);
          }

          // 💾 Save updated absence list
          localStorage.setItem(storageKey, JSON.stringify(student.absent));

          fetchedStudents.push(student);

          // 4. Subscribe to realtime updates for each student
          const channel = `databases.${databaseId}.collections.${studentCollectionId}.documents.${student.$id}`;
          client.subscribe(channel, async (response) => {
            if (response.events.some((e) => e.includes("update"))) {
              const updated = response.payload as Student;

              // compare new absences
              const updatedKnown: string[] = JSON.parse(
                localStorage.getItem(`absent_${updated.$id}`) || "[]"
              );
              const newAbsents = updated.absent.filter(
                (date) => !updatedKnown.includes(date)
              );

              for (const date of newAbsents) {
                await notifyAbsent(updated.name, date);
              }

              // update localStorage
              localStorage.setItem(
                `absent_${updated.$id}`,
                JSON.stringify(updated.absent)
              );

              setStudents((prev) =>
                prev.map((s) => (s.$id === updated.$id ? updated : s))
              );
            }
          });
        }

        setStudents(fetchedStudents);
      } catch (err) {
        console.error("Parent Notification Error:", err);
      }
    };

    init();
  }, []);

  const notifyAbsent = async (name: string, date?: string) => {
    if (!date) return;

    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }

    if (granted) {
      await sendNotification({
        title: "🚨 Absence Alert",
        body: `${name} was marked absent on ${date}`,
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">
        📋 Your Children's Absences
      </h2>

      {students.length === 0 ? (
        <p className="text-center text-gray-500">No student data available</p>
      ) : (
        <div className="space-y-6">
          {students.map((student) => (
            <div key={student.$id} className="border-b pb-4">
              <h3 className="text-lg font-semibold">{student.name}</h3>
              <p className="text-sm text-gray-600">
                Class {student.class} - Section {student.section}
              </p>
              <ul className="list-disc list-inside text-sm text-gray-800 mt-2">
                {student.absent.length ? (
                  student.absent.map((date, idx) => (
                    <li key={idx}>{date}</li>
                  ))
                ) : (
                  <li>No absences recorded ✅</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
