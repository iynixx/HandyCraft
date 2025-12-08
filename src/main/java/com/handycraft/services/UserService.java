package com.handycraft.services;


import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.User;


import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public class UserService {
    private static final String USER_DATA_FILE = "src/main/resources/data/users.json";
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private List<User> users;

    public UserService() {
        this.users = loadUsers();
    }

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
        try {
            File dataDir = new File("src/main/resources/data");
            if (!dataDir.exists()) {
                dataDir.mkdirs();
            }

            try (FileWriter writer = new FileWriter(USER_DATA_FILE)) {
                gson.toJson(this.users, writer);
            }
        } catch (IOException e) {
            System.err.println("Error saving user data: " + e.getMessage());
        }
    }

    public User registerUser(String username, String email, String passwordHash) {
        if (findUserByEmail(email) != null) {
            return null;
        }

        User newUser = new User();
        newUser.setUserId(UUID.randomUUID().toString());
        newUser.setUsername(username);
        newUser.setEmail(email);
        newUser.setPasswordHash(passwordHash);

        synchronized (this.users) {
            this.users.add(newUser);
            saveUsers();
        }
        return newUser;
    }

    public User findUserByEmail(String email) {
        return this.users.stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst()
                .orElse(null);
    }
}