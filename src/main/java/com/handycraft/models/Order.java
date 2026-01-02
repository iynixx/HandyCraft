package com.handycraft.models;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class Order {
    private String orderId;
    private String userId; // To link to the logged-in user
    private String customerName;
    private String address;
    private String phone;
    private List<Map<String, Object>> items; // List of cart items
    private double totalAmount;
    private String orderDate;
    private String status; // e.g., "Pending", "Shipped", "Completed"

    // Extracts all products IDs from the order items
    public List<String> getPurchaseProductIds() {
        if(this.items == null || this.items.isEmpty()) {
            return Collections.emptyList();
        }
        return this.items.stream()
                .map(item->String.valueOf(item.get("id")))
                .collect(Collectors.toList());
    }

    // Getters and Setters
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public List<Map<String, Object>> getItems() { return items; }
    public void setItems(List<Map<String, Object>> items) { this.items = items; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public String getOrderDate() { return orderDate; }
    public void setOrderDate(String orderDate) { this.orderDate = orderDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}