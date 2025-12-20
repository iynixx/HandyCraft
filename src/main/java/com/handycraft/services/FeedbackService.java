package com.handycraft.services;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.Feedback;
import java.io.*;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

public class FeedbackService {
    private static final String FILE_PATH = "src/main/resources/data/feedback.json";
    private final Gson gson = new Gson();
    private final ReentrantLock lock = new ReentrantLock();

    public void addFeedback(Feedback fb) throws IOException {
        lock.lock();
        try {
            List<Feedback> all = getAllFeedback();
            all.add(fb);
            try (FileWriter writer = new FileWriter(FILE_PATH)) {
                gson.toJson(all, writer);
            }
        } finally { lock.unlock(); }
    }

    public List<Feedback> getFeedbackByProduct(String productId) {
        List<Feedback> filtered = new ArrayList<>();
        for (Feedback f : getAllFeedback()) {
            if (f.getProductId().equals(productId)) filtered.add(f);
        }
        return filtered;
    }

    public List<Feedback> getAllFeedback() {
        lock.lock(); // Use the lock for safety
        try {
            File file = new File(FILE_PATH);
            if (!file.exists() || file.length() == 0) {
                return new ArrayList<>();
            }
            try (FileReader reader = new FileReader(file)) {
                // Using GSON to convert JSON file content back into a Java List
                return gson.fromJson(reader, new TypeToken<List<Feedback>>(){}.getType());
            } catch (IOException e) {
                System.err.println("Error reading feedback file: " + e.getMessage());
                return new ArrayList<>();
            }
        } finally {
            lock.unlock(); // Always unlock
        }
    }

    public double getAverageRating(String productId) {
        List<Feedback> productFeedback = getFeedbackByProduct(productId);
        if (productFeedback.isEmpty()) return 0.0;

        double sum = 0;
        for (Feedback f : productFeedback) {
            sum += f.getRating();
        }
        return sum / productFeedback.size();
    }
}