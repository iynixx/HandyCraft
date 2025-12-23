package com.handycraft.services;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.Order;
import java.io.*;
import java.lang.reflect.Type;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

public class OrderService {
    private static final String ORDER_DATA_FILE = "src/main/resources/data/orders.json";
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private List<Order> orders;
    private final ReentrantLock fileLock = new ReentrantLock();

    // Step A: Add ProductService dependency so we can update stock
    private final ProductService productService = new ProductService();

    public OrderService() {
        this.orders = loadOrdersFromFile();
    }

    private List<Order> loadOrdersFromFile() {
        File dataFile = new File(ORDER_DATA_FILE);
        if (!dataFile.exists() || dataFile.length() == 0) return new ArrayList<>();
        try (FileReader reader = new FileReader(dataFile)) {
            Type listType = new TypeToken<ArrayList<Order>>() {}.getType();
            List<Order> loaded = gson.fromJson(reader, listType);
            return loaded != null ? loaded : new ArrayList<>();
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    public void saveOrder(Order newOrder) throws IOException {
        fileLock.lock();
        try {
            // --- 1. VALIDATION LOOP ---
            if (newOrder.getItems() != null) {
                for (Map<String, Object> item : newOrder.getItems()) {
                    String productId = String.valueOf(item.get("id"));

                    // Get the variant from the item map (sent from frontend)
                    String variant = (String) item.getOrDefault("variant", "Default");

                    Object qtyObj = item.get("quantity");
                    int quantityRequested = (qtyObj instanceof Number) ? ((Number) qtyObj).intValue() : 0;

                    // Pass the specific variant to the stock check
                    if (!productService.isStockAvailable(productId, variant, quantityRequested)) {
                        throw new IOException("Insufficient stock for " + item.get("name") + " (" + variant + ")");
                    }
                }
            }

            // --- 2. REDUCTION LOOP ---
            if (newOrder.getItems() != null) {
                for (Map<String, Object> item : newOrder.getItems()) {
                    String productId = String.valueOf(item.get("id"));
                    String variant = (String) item.getOrDefault("variant", "Default");
                    int quantityToReduce = ((Number) item.get("quantity")).intValue();

                    // Reduce the specific variant stock
                    productService.reduceStock(productId, variant, quantityToReduce);
                }
            }

            // --- 3. SAVE ORDER ---
            newOrder.setOrderId("ORD-" + System.currentTimeMillis());
            newOrder.setOrderDate(new java.util.Date().toString());
            newOrder.setStatus("Pending");
            this.orders.add(newOrder);
            saveOrdersToFile();

        } finally {
            fileLock.unlock();
        }
    }

    // Helper method to handle the file writing
    private void saveOrdersToFile() throws IOException {
        try (FileWriter writer = new FileWriter(ORDER_DATA_FILE)) {
            gson.toJson(this.orders, writer);
        }
    }

    public List<Order> getAllOrders() {
        return Collections.unmodifiableList(this.orders);
    }
}