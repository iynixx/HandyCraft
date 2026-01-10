package com.handycraft.models;

// This model captures the exact JSON fields sent from the signin.html form.
public class LoginRequest {
    private String email;
    private String password;

    // Getters only for reading the request data
    public String getEmail() { return email; }
    public String getPassword() { return password; }
}

