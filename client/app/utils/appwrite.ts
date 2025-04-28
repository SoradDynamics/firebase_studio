// import { Client, Account, ID } from "appwrite";

// const client = new Client()
//   .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
//   .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// export const account = new Account(client);
// export const iD = ID
// export default client;

import { Client, Account, ID, Databases, Storage, Query, Functions } from "appwrite";

const client = new Client();

function initializeAppwriteClient() {
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
    const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

    if (!endpoint) {
        console.error("VITE_APPWRITE_ENDPOINT is not defined in your environment variables!");
        return;
    }

    if (!projectId) {
        console.error("VITE_APPWRITE_PROJECT_ID is not defined in your environment variables!");
        return; 
    }

    client
        .setEndpoint(endpoint)
        .setProject(projectId);

    // console.log("Appwrite Client initialized successfully.");
    // console.log("Endpoint:", endpoint); 
    // console.log("Project ID:", projectId);
}

initializeAppwriteClient(); 

export const account = new Account(client);
export const iD = ID; 
export {ID, Query};
export const databases = new Databases (client);
export const storage = new Storage(client);
export const functions = new Functions(client); // <<< Initialize and export Functions
export default client;




async function getCurrentUserEmail() {
    try {
      const user = await account.get();
      console.log(user.email); // Print email
      return user.email;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
  
export { getCurrentUserEmail };