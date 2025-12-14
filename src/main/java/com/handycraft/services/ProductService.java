package com.handycraft.services;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.Product;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.Collections;
import java.util.List;
import java.util.ArrayList;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;
import java.util.HashMap;
import java.util.Map;

/**
 * Handles the business logic for products, implementing persistent CRUD operations
 * by writing to a file path.
 */
public class ProductService {

    // IMPORTANT: Path changed to be writable on the file system
    private static final String PRODUCT_DATA_FILE = "src/main/resources/data/products.json";

    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private List<Product> products;
    private final ReentrantLock fileLock = new ReentrantLock();

    public ProductService() {
        // Load data on service initialization
        this.products = loadProductsFromFile();
    }

    // --- Private File I/O Methods (Writable) ---

    private List<Product> loadProductsFromFile() {
        File dataFile = new File(PRODUCT_DATA_FILE);

        if (!dataFile.exists() || dataFile.length() == 0) {
            return new ArrayList<>();
        }

        try (FileReader reader = new FileReader(dataFile)) {
            Type productListType = new TypeToken<ArrayList<Product>>() {}.getType();
            List<Product> loadedList = gson.fromJson(reader, productListType);

            return loadedList != null ? loadedList : new ArrayList<>();
        } catch (IOException e) {
            System.err.println("Error reading product data file: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    private void saveProductsToFile() throws IOException {
        fileLock.lock();
        try {
            File dataDir = new File("src/main/resources/data");
            if (!dataDir.exists()) {
                dataDir.mkdirs();
            }

            try (FileWriter writer = new FileWriter(PRODUCT_DATA_FILE)) {
                gson.toJson(this.products, writer);
            }
        } finally {
            fileLock.unlock();
        }
    }

    // --- Public Read Method ---

    public List<Product> loadAllProducts() {
        // Return a read-only copy of the internal list
        return Collections.unmodifiableList(this.products);
    }

    // ====================================================================
    // --- ADMIN-REQUIRED CRUD METHODS ---
    // ====================================================================

    /**
     * Adds a new product and persists the change. (CREATE)
     */
    public Product addProduct(Product newProduct) throws IOException {
        fileLock.lock();
        try {
            // Generate a proper unique ID
            String newId = UUID.randomUUID().toString();
            newProduct.setId(newId);

            // Set default fields
            if (newProduct.getCategory() == null || newProduct.getCategory().isBlank()) {
                newProduct.setCategory("Uncategorized");
            }

            // FIX: If inventory map is missing or empty, initialize it with a default variant
            if (newProduct.getInventory() == null || newProduct.getInventory().isEmpty()) {
                Map<String, Integer> defaultInventory = new HashMap<>();
                defaultInventory.put("Default", 10); // Start with 10 units of a default variant
                newProduct.setInventory(defaultInventory);
            }

            this.products.add(newProduct);
            saveProductsToFile();

            return newProduct;
        } finally {
            fileLock.unlock();
        }
    }

    /**
     * Updates an existing product and persists the change. (UPDATE)
     */
    public boolean updateProduct(Product updatedProduct) throws IOException {
        fileLock.lock();
        boolean found = false;
        try {
            for (int i = 0; i < this.products.size(); i++) {
                if (this.products.get(i).getId().equals(updatedProduct.getId())) {
                    this.products.set(i, updatedProduct);
                    found = true;
                    break;
                }
            }

            if (found) {
                saveProductsToFile();
            }
            return found;
        } finally {
            fileLock.unlock();
        }
    }

    /**
     * Deletes a product by ID and persists the change. (DELETE)
     */
    public boolean deleteProduct(String productId) throws IOException {
        fileLock.lock();
        boolean removed = false;
        try {
            // The removeIf method is clean and efficient
            removed = this.products.removeIf(p -> p.getId().equals(productId));

            if (removed) {
                saveProductsToFile();
            }
            return removed;
        } finally {
            fileLock.unlock();
        }
    }
}