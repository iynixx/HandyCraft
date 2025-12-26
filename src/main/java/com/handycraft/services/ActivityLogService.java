package com.handycraft.services;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.ActivityLog;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

public class ActivityLogService {

    private static final String LOG_FILE_PATH = "src/main/resources/data/activity_logs.json";

    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private List<ActivityLog> logs;
    private final ReentrantLock lock = new ReentrantLock();

    public ActivityLogService() {
        this.logs = loadLogsFromFile();
    }

    private List<ActivityLog> loadLogsFromFile() {
        File file = new File(LOG_FILE_PATH);

        if (!file.exists() || file.length() == 0) {
            return new ArrayList<>();
        }

        try (FileReader reader = new FileReader(file)) {
            Type logListType = new TypeToken<ArrayList<ActivityLog>>() {}.getType();
            List<ActivityLog> loadedLogs = gson.fromJson(reader, logListType);
            return loadedLogs != null ? loadedLogs : new ArrayList<>();
        } catch (IOException e) {
            System.err.println("Error reading activity log file: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    private void saveLogsToFile() {
        lock.lock();
        try {
            File dataDir = new File("src/main/resources/data");
            if (!dataDir.exists()) {
                dataDir.mkdirs();
            }

            try (FileWriter writer = new FileWriter(LOG_FILE_PATH)) {
                gson.toJson(this.logs, writer);
            }
        } catch (IOException e) {
            System.err.println("Error saving activity logs: " + e.getMessage());
        } finally {
            lock.unlock();
        }
    }

    public void addLog(ActivityLog log) {
        lock.lock();
        try {
            this.logs.add(log);
            saveLogsToFile();
        } finally {
            lock.unlock();
        }
    }

    public List<ActivityLog> getAllLogs() {
        lock.lock();
        try {
            return new ArrayList<>(this.logs);
        } finally {
            lock.unlock();
        }
    }

    public void clearAllLogs() {
        lock.lock();
        try {
            this.logs.clear();
            saveLogsToFile();
        } finally {
            lock.unlock();
        }
    }
}