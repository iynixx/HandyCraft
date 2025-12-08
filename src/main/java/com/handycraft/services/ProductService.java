package com.handycraft.services;


import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.handycraft.models.Product;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class ProductService {
    private static final String PRODUCT_DATA_FILE = "src/main/resources/data/products.json";
    private final Gson gson = new Gson();

    public List<Product> loadAllProducts() {
        File dataFile = new File(PRODUCT_DATA_FILE);

        if (!dataFile.exists() || dataFile.length() == 0) {
            return new ArrayList<>();
        }

        try (FileReader reader = new FileReader(dataFile)) {
            Type listType = new TypeToken<ArrayList<Product>>() {}.getType();
            List<Product> products = gson.fromJson(reader, listType);

            return products != null ? products : new ArrayList<>();
        } catch (IOException e) {
            System.err.println("Error reading product data file: " + e.getMessage());
            return new ArrayList<>();
        }
    }
}