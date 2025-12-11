package com.handycraft.models;

import com.google.gson.annotations.SerializedName;
import java.util.Map;
import java.util.Objects;

public class Product {

    @SerializedName("Product ID")
    private String id;

    @SerializedName("Category")
    private String category;

    @SerializedName("Product Name")
    private String name;

    @SerializedName("Price (RM)")
    private double price;

    @SerializedName("Description")
    private String description;

    @SerializedName("File Name")
    private String imageUrl;

    // The key is here: Gson EXPECTS a JSON OBJECT ({...}) for this Map.
    @SerializedName("Inventory")
    private Map<String, Integer> inventory;

    public Product() {}

    public Product(String id, String category, String name, double price, String description, String imageUrl, Map<String, Integer> inventory) {
        this.id = id;
        this.category = category;
        this.name = name;
        this.price = price;
        this.description = description;
        this.imageUrl = imageUrl;
        this.inventory = inventory;
    }

    // --- Getters and Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Map<String, Integer> getInventory() { return inventory; }
    public void setInventory(Map<String, Integer> inventory) { this.inventory = inventory; }

    // --- Utility Methods (For better debugging) ---

    @Override
    public String toString() {
        return "Product{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", price=" + price +
                ", inventory=" + inventory +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Product product = (Product) o;
        return Objects.equals(id, product.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}