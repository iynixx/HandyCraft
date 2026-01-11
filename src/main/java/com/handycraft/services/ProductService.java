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

public class ProductService {

    private static final String PRODUCT_DATA_FILE = "src/main/resources/data/products.json";

    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private List<Product> products;
    private final ReentrantLock fileLock = new ReentrantLock();

    public ProductService() {
        this.products = loadProductsFromFile();
    }

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

    public List<Product> loadAllProducts() {
        return Collections.unmodifiableList(this.products);
    }

    public Product addProduct(Product newProduct) throws IOException {
        fileLock.lock();
        try {
            int nextId = products.stream()
                    .mapToInt(p -> {
                        try {
                            return Integer.parseInt(p.getId());
                        } catch (NumberFormatException e) {
                            return 0;
                        }
                    })
                    .max()
                    .orElse(0) + 1;

            newProduct.setId(String.valueOf(nextId));

            if (newProduct.getCategory() == null || newProduct.getCategory().isBlank()) {
                newProduct.setCategory("Uncategorized");
            }

            if (newProduct.getInventory() == null || newProduct.getInventory().isEmpty()) {
                Map<String, Integer> defaultInventory = new HashMap<>();
                defaultInventory.put("Default", 10);
                newProduct.setInventory(defaultInventory);
            }

            this.products.add(newProduct);
            saveProductsToFile();

            return newProduct;
        } finally {
            fileLock.unlock();
        }
    }

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

    public boolean deleteProduct(String productId) throws IOException {
        fileLock.lock();
        boolean removed = false;
        try {
            removed = this.products.removeIf(p -> p.getId().equals(productId));

            if (removed) {
                saveProductsToFile();
            }
            return removed;
        } finally {
            fileLock.unlock();
        }
    }

    public void reduceStock(String productId, String variant, int quantity) throws IOException {
        fileLock.lock();
        try {
            boolean stockUpdated = false;
            for (Product p : this.products) {
                if (p.getId().equals(productId)) {
                    Map<String, Integer> inventory = p.getInventory();

                    if (inventory != null && inventory.containsKey(variant)) {
                        int currentStock = inventory.get(variant);
                        inventory.put(variant, Math.max(0, currentStock - quantity));
                        stockUpdated = true;
                    }
                    break;
                }
            }

            if (stockUpdated) {
                saveProductsToFile();
            }
        } finally {
            fileLock.unlock();
        }
    }

    public boolean isStockAvailable(String productId, String variant, int requestedQuantity) {
        for (Product p : this.products) {
            if (p.getId().equals(productId)) {
                Map<String, Integer> inventory = p.getInventory();
                if (inventory != null && inventory.containsKey(variant)) {
                    return inventory.get(variant) >= requestedQuantity;
                }
            }
        }
        return false;
    }
}