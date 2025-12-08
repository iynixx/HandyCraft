package com.handycraft.models;

public class RegisterRequest {
    private String username;
    private String email;
    private String password; // The field name GSON expects

    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
}