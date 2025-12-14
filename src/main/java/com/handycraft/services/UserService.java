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
            Type listType = new TypeToken<ArrayList<User>>() {}.getType();
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
                gson.toJson(this.users, writer);
            }
        } catch (IOException e) {
            System.err.println("Error saving user data: " + e.getMessage());
        } finally {
            fileLock.unlock();
        }
    }

    // --- Public Authentication/Registration Methods ---

    public User registerUser(String username, String email, String plainPassword) {
        if (findUserByEmail(email) != null) {
            return null; // User already exists
        }

        User newUser = new User();
        newUser.setUserId(UUID.randomUUID().toString());
        newUser.setUsername(username);
        newUser.setEmail(email);

        String salt = HashUtil.generateSalt();
        String hashedPassword = HashUtil.hashPassword(plainPassword, salt);

        newUser.setSalt(salt);
        newUser.setPasswordHash(hashedPassword);
        newUser.setRole("customer"); // Default role (Changed from "user" to be explicit)

        synchronized (this.users) {
            this.users.add(newUser);
            saveUsers();
        }

        System.out.println("New user registered with salt: " + salt.substring(0, 8) + "...");
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