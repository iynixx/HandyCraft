package com.handycraft.services;


import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.User;
import com.handycraft.utils.HashUtil;


import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock; // Using a lock for thread-safe list modification
import java.util.Map;
import java.util.HashMap;

public class UserService {
    private static final String USER_DATA_FILE = "src/main/resources/data/users.json";
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private List<User> users;
    // Use a lock to ensure thread safety when modifying the users list and saving the file
    private final ReentrantLock fileLock = new ReentrantLock();

    public UserService() {
        // Load users on service initialization
        this.users = loadUsers();
    }

    // --- Private File I/O Methods ---

    // Updated to return a list for internal use
    private List<User> loadUsers() {
        File dataFile = new File(USER_DATA_FILE);

        if (!dataFile.exists() || dataFile.length() == 0) {
            return new ArrayList<>();
        }

        try (FileReader reader = new FileReader(dataFile)) {
            Type listType = new TypeToken<ArrayList<User>>() {
            }.getType();
            List<User> loadedList = gson.fromJson(reader, listType);
            return loadedList != null ? loadedList : new ArrayList<>();
        } catch (IOException e) {
            System.err.println("Error reading user data file: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    private void saveUsers() {
        // Ensure only one thread writes to the file at a time
        fileLock.lock();
        try {
            File dataDir = new File("src/main/resources/data");
            if (!dataDir.exists()) {
                dataDir.mkdirs();
            }

            try (FileWriter writer = new FileWriter(USER_DATA_FILE)) {
                // Save the current state of the users list
                String json = gson.toJson(this.users);
                writer.write(json);
                System.out.println("DEBUG: Saved " + this.users.size() + " users to file");
            }
        } catch (IOException e) {
            System.err.println("Error saving user data: " + e.getMessage());
        } finally {
            fileLock.unlock();
        }
    }

    // --- Public Authentication/Registration Methods ---

    public User registerUser(String username, String email, String plainPassword, String answer1, String answer2, String answer3) {
        if (findUserByEmail(email) != null) {
            return null; // User already exists
        }

        User newUser = new User();
        newUser.setUserId(UUID.randomUUID().toString());
        newUser.setUsername(username);
        newUser.setEmail(email);

        // Generate salt and hash for password
        String passwordSalt = HashUtil.generateSalt();
        String hashedPassword = HashUtil.hashPassword(plainPassword, passwordSalt);
        newUser.setSalt(passwordSalt);
        newUser.setPasswordHash(hashedPassword);
        newUser.setRole("customer"); // Default role (Changed from "user" to be explicit)

        // Generate separate salt for security answers
        String securitySalt = HashUtil.generateSalt();
        newUser.setSecuritySalt(securitySalt); // Store the salt

        // Hash security answers with the security salt
        // Convert to lowercase for case-insensitive matching
        newUser.setSecurityAnswer1Hash(HashUtil.hashSecurityAnswer(answer1, securitySalt));
        newUser.setSecurityAnswer2Hash(HashUtil.hashSecurityAnswer(answer2, securitySalt));
        newUser.setSecurityAnswer3Hash(HashUtil.hashSecurityAnswer(answer3, securitySalt));

        synchronized (this.users) {
            this.users.add(newUser);
            saveUsers();
        }

        System.out.println("New user registered with hashed security answers");
        return newUser;
    }

    public User findUserByEmail(String email) {
        return this.users.stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst()
                .orElse(null);
    }

    public User authenticateUser(String email, String plainPassword) {
        User user = findUserByEmail(email);
        if (user == null) {
            return null;  // User not found
        }

        String storedSalt = user.getSalt();
        String hashedInput = HashUtil.hashPassword(plainPassword, storedSalt);

        if (hashedInput.equals(user.getPasswordHash())) {
            return user;  // Password matches!
        }

        return null;  // Password doesn't match
    }

    // Get security questions
    public Map<String, String> getSecurityQuestions() {
        Map<String, String> questions = new HashMap<>();
        questions.put("question1", "What is your favourite colour?");
        questions.put("question2", "What is your best friend's nickname?");
        questions.put("question3", "What city were you born in?");
        return questions;
    }

    // Verify security answers
    public boolean verifySecurityAnswers(String email, String answer1, String answer2, String answer3) {
        User user = findUserByEmail(email);
        if (user == null) {
            return false;
        }
        // Get the security salt stored with the user
        String securitySalt = user.getSecuritySalt();
        if (securitySalt == null || securitySalt.isEmpty()) {
            return false; // No security salt means answers aren't properly set up
        }

        // Hash the provided answers with the same salt
        String providedHash1 = HashUtil.hashSecurityAnswer(answer1, securitySalt);
        String providedHash2 = HashUtil.hashSecurityAnswer(answer2, securitySalt);
        String providedHash3 = HashUtil.hashSecurityAnswer(answer3, securitySalt);

        // Compare the hashes
        return providedHash1.equals(user.getSecurityAnswer1Hash()) &&
                providedHash2.equals(user.getSecurityAnswer2Hash()) &&
                providedHash3.equals(user.getSecurityAnswer3Hash());
    }

    // Reset password
    public boolean resetPassword(String email, String newPassword) {
        User user = findUserByEmail(email);
        if (user == null) {
            System.err.println("User not found with email: " + email);
            return false;
        }
        System.out.println("Resetting password for user: " + email);
        String newSalt = HashUtil.generateSalt();
        String newHash = HashUtil.hashPassword(newPassword, newSalt);

        // Update the user in the synchronized list
        synchronized (this.users) {
            // Find the user in the list and update it
            for (int i = 0; i < this.users.size(); i++) {
                User u = this.users.get(i);
                if (u.getEmail().equalsIgnoreCase(email)) {
                    // Update this specific user object
                    u.setSalt(newSalt);
                    u.setPasswordHash(newHash);
                    this.users.set(i, u); // Update in the list
                    System.out.println("Password updated in memory for: " + email);
                    break;
                }
            }

            // Save the updated list to file
            saveUsers();
        }

        System.out.println("Password reset successful for: " + email);
        return true;
    }

    // Check if user has set up security answers
    public boolean hasSecurityAnswers(String email) {
        User user = findUserByEmail(email);
        if (user == null) {
            return false;
        }
        // Check if answer hash fields AND security salt are not null
        return user.getSecurityAnswer1Hash() != null &&
                !user.getSecurityAnswer1Hash().isEmpty() &&
                user.getSecurityAnswer2Hash() != null &&
                !user.getSecurityAnswer2Hash().isEmpty() &&
                user.getSecurityAnswer3Hash() != null &&
                !user.getSecurityAnswer3Hash().isEmpty() &&
                user.getSecuritySalt() != null &&
                !user.getSecuritySalt().isEmpty();
    }

    // ====================================================================
    // --- NEW ADMIN-REQUIRED METHODS ---
    // ====================================================================

    /**
     * Retrieves the entire list of users. Used by AdminHandler for /users and /stats.
     */
    public List<User> getAllUsers() {
        // Return a read-only copy of the list to prevent outside modification
        return Collections.unmodifiableList(this.users);
    }

    /**
     * Finds a user by their unique ID. Used by AdminHandler for security check.
     */
    public User findUserById(String userId) {
        return this.users.stream()
                .filter(u -> u.getUserId().equals(userId))
                .findFirst()
                .orElse(null);
    }

    /**
     * Updates the role of a user and persists the change to users.json.
     * Used by AdminHandler's handleUpdateUserRole.
     */
    public boolean updateUserRole(String userId, String newRole) {
        boolean success = false;

        // Synchronization is necessary as we are modifying the shared list
        synchronized (this.users) {
            for (int i = 0; i < this.users.size(); i++) {
                User user = this.users.get(i);
                if (user.getUserId().equals(userId)) {
                    // Update the role
                    user.setRole(newRole);
                    // Update the object in the list
                    this.users.set(i, user);
                    success = true;
                    break;
                }
            }

            if (success) {
                // Only save the file if a modification occurred
                saveUsers();
            }
        }
        return success;
    }
}