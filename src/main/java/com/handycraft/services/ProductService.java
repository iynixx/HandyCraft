package com.handycraft.services;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.Product;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.lang.reflect.Type;
import java.util.Collections;
import java.util.List;
import java.util.ArrayList;

/**
 * Handles the business logic for products, including loading data from the JSON file.
 */
public class ProductService {

    // 🏆 FINAL FIX: This path is confirmed by the console output to be correct for your environment.
    private static final String PRODUCT_DATA_RESOURCE = "data/products.json";

    private final Gson gson = new Gson();

    /**
     * Loads all products from the products.json file using the ClassLoader.
     * @return A List of Product objects, or an empty list if loading fails.
     */
    public List<Product> loadAllProducts() {

        // Use try-with-resources to ensure the InputStream is safely closed
        try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(PRODUCT_DATA_RESOURCE)) {

            if (inputStream == null) {
                // If the file is not found, log an error and return empty list
                System.err.println("CRITICAL ERROR: Product data file not found at resource path: " + PRODUCT_DATA_RESOURCE);
                return Collections.emptyList();
            }

            // Create a Reader from the InputStream to feed into Gson
            Reader reader = new InputStreamReader(inputStream);

            // Define the target type for Gson: a List of Product objects
            Type productListType = new TypeToken<ArrayList<Product>>() {}.getType();

            // Deserialize the JSON array into the List<Product>.
            List<Product> products = gson.fromJson(reader, productListType);

            // Check if the list is null or empty after parsing (bad JSON syntax)
            if (products == null || products.isEmpty()) {
                System.err.println("WARNING: Product data loaded successfully but the resulting list is empty or null. Check JSON syntax.");
                return Collections.emptyList();
            }

            // Success log
            System.out.println("SUCCESS: Loaded " + products.size() + " products from " + PRODUCT_DATA_RESOURCE);

            return products;

        } catch (Exception e) {
            System.err.println("ERROR: Failed to load or parse product data. Check JSON syntax and Product model mapping.");
            e.printStackTrace();
            return Collections.emptyList();
        }
    }
}