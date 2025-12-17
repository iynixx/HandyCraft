package com.handycraft.models;

public class User {
    private String userId;
    private String username;
    private String email;
    private String passwordHash;
    private String salt; // Salt for password
    private String role = "user"; // Default role is "user"
    private String securityAnswer1Hash;
    private String securityAnswer2Hash;
    private String securityAnswer3Hash;
    private String securitySalt; // Salt for security answers

    public User() {}

    public String getUserId() {
        return userId;
    }
    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }
    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }
    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }
    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getSalt() {return salt;}
    public void setSalt(String salt) {this.salt = salt;}

    public String getRole() {
        return role;
    }
    public void setRole(String role) {this.role = role;}

    public String getSecurityAnswer1Hash() {return securityAnswer1Hash;}
    public void setSecurityAnswer1Hash(String securityAnswer1Hash) {this.securityAnswer1Hash = securityAnswer1Hash;}

    public String getSecurityAnswer2Hash() {return securityAnswer2Hash;}
    public void setSecurityAnswer2Hash(String securityAnswer2Hash) {this.securityAnswer2Hash = securityAnswer2Hash;}

    public String getSecurityAnswer3Hash() {return securityAnswer3Hash;}
    public void setSecurityAnswer3Hash(String securityAnswer3Hash) {this.securityAnswer3Hash = securityAnswer3Hash;}

    public String getSecuritySalt() {return securitySalt;}
    public void setSecuritySalt(String securitySalt) {this.securitySalt = securitySalt;}
}