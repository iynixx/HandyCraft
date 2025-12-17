package com.handycraft.utils;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

public class HashUtil {

    // Generate random salt (16 bytes = 24 characters when encoded)
    public static String generateSalt(){
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[16];
        random.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    // Hash password with salt
    public static String hashPassword(String password, String salt){
        return hashWithSalt(password, salt);
    }
    // Hash security answers
    public static String hashSecurityAnswer(String answer, String salt){
        return hashWithSalt(answer.toLowerCase(), salt); // Convert to lowercase for case-insensitive comparison
    }
    // Private helper method for hashing
    private static String hashWithSalt(String input, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes()); // Combine salt with input
            md.update(input.getBytes());
            byte[] bytes = md.digest();
            // Convert to hex string
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}