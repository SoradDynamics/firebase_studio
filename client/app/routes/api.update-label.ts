import { json } from "@remix-run/node";
import { Client, Users } from "node-appwrite";

async function action({ request }: { request: Request }) {
  const { userId, label } = await request.json();

  if (!userId || !label) {
    return json({ error: "User ID and Label are required." }, { status: 400 });
  }

  try {
    // Initialize Appwrite Admin SDK
    const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(import.meta.env.VITE_APPWRITE_API_KEY);

    const users = new Users(client);

    // Update user label
    const response = await users.updateLabels(userId, [label]);
    return json({ success: true, data: response });
  } catch (error: any) {
    return json({ error: error.message }, { status: 500 });
  }
}
