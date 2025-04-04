// controllers/signupController.js
const { users, ID } = require('../../config/appwrite'); // Import Appwrite services and ID
const { generateStudentEmail, generatePassword } = require('../../utils/helpers');

// --- Signup Controller ---
const handleSignup = async (req, res) => {
    const { isExistingParent, studentName, parentName, parentEmail } = req.body;

    // --- Input Validation ---
    if (!studentName) {
        return res.status(400).json({ message: 'Student name is required' });
    }
    if (!isExistingParent && (!parentName || !parentEmail)) {
        return res.status(400).json({ message: 'Parent name and email are required for new parent' });
    }
    if (!isExistingParent && parentEmail && !/\S+@\S+\.\S+/.test(parentEmail)) {
         return res.status(400).json({ message: 'Invalid parent email format' });
    }

    let parentUserId = null;
    let studentUserId = null;
    const studentPassword = generatePassword();
    const studentEmail = generateStudentEmail(studentName);

    console.log("--- Signup Request Received ---");
    console.log("Request Body:", req.body);
    console.log(`Generated Student Credentials: Email=${studentEmail}`); // Don't log password

    try {
        // --- Create Parent User (if new) ---
        if (!isExistingParent) {
            const parentPassword = generatePassword();
            try {
                console.log(`Attempting to create Parent User: Email=${parentEmail}, Name=${parentName}`);
                const parentUser = await users.create(
                    ID.unique(),
                    parentEmail,
                    null, // phone
                    parentPassword,
                    parentName
                );
                parentUserId = parentUser.$id;
                console.log(`Created Parent User: ID=${parentUserId}`);

                await users.updateLabels(parentUserId, ['parent']);
                console.log(`Updated Parent User ${parentUserId} label to 'parent'`);

            } catch (error) {
                if (error.code === 409 && error.message.includes('already exists')) {
                    console.warn(`Parent user creation conflict for email ${parentEmail}: ${error.message}`);
                    return res.status(409).json({ message: `Parent user with email ${parentEmail} already exists. Please use the 'Existing Parent' option or log in.` });
                }
                console.error('Error creating parent user:', error);
                return res.status(500).json({ message: 'Failed to create parent user', error: error.message });
            }
        } else {
            console.log("Existing parent flow - skipping parent creation.");
        }

        // --- Create Student User ---
        try {
            console.log(`Attempting to create Student User: Email=${studentEmail}, Name=${studentName}`);
            const studentUser = await users.create(
                ID.unique(),
                studentEmail,
                null, // phone
                studentPassword,
                studentName
            );
            studentUserId = studentUser.$id;
            console.log(`Created Student User: ID=${studentUserId}`);

            await users.updateLabels(studentUserId, ['student']);
            console.log(`Updated Student User ${studentUserId} label to 'student'`);

        } catch (error) {
            console.error('Error creating student user:', error);
            // Cleanup: If parent was created in *this request* and student fails, delete the new parent.
            if (parentUserId) {
                 console.warn(`Student creation failed for ${studentName}. Deleting newly created parent user ${parentUserId}.`);
                 try {
                     await users.delete(parentUserId);
                     console.log(`Successfully deleted newly created parent user ${parentUserId} due to student creation failure.`);
                 } catch (deleteError) {
                     console.error(`Failed to delete parent user ${parentUserId} during cleanup:`, deleteError);
                 }
            }
             if (error.code === 409 && error.message.includes('already exists')) {
                 console.warn(`Student user creation conflict for email ${studentEmail}: ${error.message}`);
                return res.status(409).json({ message: `A user with the generated student email ${studentEmail} already exists. Please try again.` });
             }
            return res.status(500).json({ message: 'Failed to create student user', error: error.message });
        }

        // --- Success ---
        console.log("--- User Creation Process Successful ---");
        res.status(201).json({
            message: 'Users created successfully',
            parentUserId: parentUserId,
            studentUserId: studentUserId,
            studentEmail: studentEmail,
            // DO NOT SEND PASSWORDS
        });

    } catch (error) {
        console.error('Unhandled error during signup process:', error);
        res.status(500).json({ message: 'An unexpected error occurred during signup', error: error.message });
    }
};

module.exports = {
    handleSignup, // Export the handler function
};