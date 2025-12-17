package com.handycraft.models;

public class RegisterRequest {
    private String username;
    private String email;
    private String password; // The field name GSON expects

    private String securityAnswer1;
    private String securityAnswer2;
    private String securityAnswer3;

    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }

    public String getSecurityAnswer1() { return securityAnswer1; }
    public String getSecurityAnswer2() { return securityAnswer2; }
    public String getSecurityAnswer3() { return securityAnswer3; }
}