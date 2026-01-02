package com.handycraft.models;

public class Feedback {
    private String id;
    private String productId;
    private String username;
    private String userEmail;
    private int rating; // This will store the 1-5 value
    private String comment;

    public Feedback() {}

    // Getters and Setters
    public String getId() { return id;}
    public void setId(String id) { this.id = id; }
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
}