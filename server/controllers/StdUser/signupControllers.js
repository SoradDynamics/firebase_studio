// controllers/StdUser/signupControllers.js
const { users, ID, AppwriteException } = require('../../config/appwrite');

/**
 * Creates a new generic Appwrite Auth user.
 * Expects email, password, and name in the request body.
 * Optionally accepts an array of 'labels' in the request body.
 */
const signupUser = async (req, res) => { // Renamed function
    const { email, password, name, labels } = req.body; // Add labels

    // --- Basic Input Validation ---
    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: email, password, and name are required.',
        });
    }

    // Validate labels if provided (must be an array of strings)
    const userLabels = Array.isArray(labels) ? labels.filter(l => typeof l === 'string') : []; // Default to empty array if not provided or invalid

    try {
        // --- Create the Appwrite Auth User ---
        // console.log(`Attempting to create user: ${email}`);
        const newUser = await users.create(
            ID.unique(),    // Generate unique Appwrite User ID
            email,
            null,           // Phone number (optional)
            password,
            name
        );
        // console.log(`Successfully created user ${newUser.$id} for email: ${email}`);

        // --- Apply labels if provided ---
        if (userLabels.length > 0) {
            try {
                // console.log(`Attempting to apply labels [${userLabels.join(', ')}] to user ${newUser.$id}`);
                // updateLabels replaces existing labels
                await users.updateLabels(newUser.$id, userLabels);
                // console.log(`Successfully applied labels for user ${newUser.$id}`);
            } catch (labelError) {
                // console.error(`Error applying labels to user ${newUser.$id}:`, labelError);
                // Log the error but proceed - user is created. Consider if this should be a fatal error.
            }
        } else {
            //  console.log(`No labels provided for user ${newUser.$id}. Skipping label update.`);
        }


        // --- Send Success Response ---
        // Fetch the user again to get the most up-to-date info including labels IF the update was immediate
        // Or simply return the intended state based on input 'userLabels'
        const createdUserData = await users.get(newUser.$id); // Fetch updated user data

        res.status(201).json({
            success: true,
            message: 'User created successfully.',
            userId: createdUserData.$id,
            email: createdUserData.email,
            name: createdUserData.name,
            labels: createdUserData.labels // Return the actual labels from Appwrite
        });

    } catch (error) {
        console.error('Error creating user:', error);

        // --- Handle Specific Appwrite Errors ---
        if (error instanceof AppwriteException) {
            if (error.code === 409) { // User already exists
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists.',
                    code: error.code,
                });
            }
            if (error.code === 400) { // Invalid input
                return res.status(400).json({
                    success: false,
                    message: `Invalid request parameter: ${error.message}`,
                    code: error.code,
                });
            }
        }

        // --- Generic Server Error ---
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred while creating the user.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

module.exports = {
    signupUser, // Export the generalized function
};