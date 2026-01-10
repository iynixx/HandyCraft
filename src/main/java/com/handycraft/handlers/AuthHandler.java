package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.models.LoginRequest;
import com.handycraft.models.RegisterRequest;
import com.handycraft.models.User;
import com.handycraft.services.UserService;
import com.handycraft.utils.ResponseUtil;


import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;

public class AuthHandler implements HttpHandler {
    private final Gson gson = new Gson();
    private final UserService userService = UserService.getInstance();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        String pathSegment = path.substring(path.lastIndexOf('/'));

        // Essential: Handle CORS preflight requests from the browser
        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1); // 204 No Content
            return;
        }

        // Only allow POST methods for auth APIs
        if (!method.equalsIgnoreCase("POST")) {
            ResponseUtil.sendResponse(exchange, 405, "{\"message\": \"Method Not Allowed\"}", "application/json");
            return;
        }

        try {
            switch (pathSegment) {
                case "/register":
                    handleRegister(exchange);
                    break;
                case "/login":
                    handleLogin(exchange);
                    break;
                default:
                    ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Endpoint Not Found\"}", "application/json");
                    break;
            }
        } catch (Exception e) {
            System.err.println("Fatal Error in AuthHandler: " + e.getMessage());
            e.printStackTrace();
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Internal Server Error\"}", "application/json");
        }
    }

    // --- Registration Logic ---
    private void handleRegister(HttpExchange exchange) throws IOException {
        RegisterRequest request = readRequestBody(exchange, RegisterRequest.class);

        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();
        String password = request.getPassword();

        // === 1. CHECK EMPTY FIELDS ===
        if (username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"All fields are required.\"}", "application/json");
            return;
        }

        // === 2. USERNAME VALIDATION ===
        if (username.length() < 2 || username.length() > 20) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Username must be 2-20 characters.\"}", "application/json");
            return;
        }

        if (!username.matches("^[a-zA-Z\\s]+$")) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Username can only contain letters and spaces.\"}", "application/json");
            return;
        }

        // Auto-capitalize username
        String formattedUsername = Arrays.stream(username.toLowerCase().split("\\s+"))
                .filter(word -> !word.isEmpty())
                .map(word -> word.substring(0, 1).toUpperCase() + word.substring(1))
                .collect(Collectors.joining(" "));

        // === 3. EMAIL VALIDATION ===
        if (!email.contains("@")) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Invalid email format (must contain @).\"}", "application/json");
            return;
        }

        // === CHECK IF EMAIL EXISTS ===
        if (userService.findUserByEmail(email) != null) {
            ResponseUtil.sendResponse(exchange, 409,
                    "{\"message\": \"Email already registered.\"}", "application/json");
            return;
        }

        // === 4. PASSWORD VALIDATION ===
        // Length: 8-15 characters
        if (password.length() < 8 || password.length() > 15) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Password must be 8-15 characters.\"}", "application/json");
            return;
        }

        // Must have at least 1 number
        if (!password.matches(".*\\d.*")) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Password must contain at least 1 number.\"}", "application/json");
            return;
        }

        // Must have at least 1 uppercase
        if (!password.matches(".*[A-Z].*")) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Password must contain at least 1 uppercase letter.\"}", "application/json");
            return;
        }

        // Must have at least 1 lowercase
        if (!password.matches(".*[a-z].*")) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Password must contain at least 1 lowercase letter.\"}", "application/json");
            return;
        }

        // No spaces allowed
        if (password.contains(" ")) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"Password cannot contain spaces.\"}", "application/json");
            return;
        }

        // === 5. SECURITY QUESTIONS VALIDATION ===
        // Get security answers from the request
        String securityAnswer1 = request.getSecurityAnswer1();
        String securityAnswer2 = request.getSecurityAnswer2();
        String securityAnswer3 = request.getSecurityAnswer3();

        // Validate security answers exist
        if (securityAnswer1 == null || securityAnswer1.isEmpty() ||
                securityAnswer2 == null || securityAnswer2.isEmpty() ||
                securityAnswer3 == null || securityAnswer3.isEmpty()) {
            ResponseUtil.sendResponse(exchange, 400,
                    "{\"message\": \"All security questions must be answered.\"}", "application/json");
            return;
        }

        // All validation passes
        User newUser = userService.registerUser(formattedUsername, email, password,securityAnswer1,securityAnswer2,securityAnswer3);

        if (newUser != null) {
            String jsonResponse = "{\"userId\": \"" + newUser.getUserId() + "\", \"username\": \"" + newUser.getUsername() + "\"}";
            ResponseUtil.sendResponse(exchange, 201, jsonResponse, "application/json");
        } else {
            ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"Registration failed.\"}", "application/json");
        }
    }

    // Login
    private void handleLogin(HttpExchange exchange) throws IOException {
        LoginRequest credentials = readRequestBody(exchange, LoginRequest.class);

        User storedUser = userService.authenticateUser(
                credentials.getEmail(),
                credentials.getPassword()
        );

        if (storedUser == null) {
            ResponseUtil.sendResponse(exchange, 401,
                    "{\"message\": \"Login failed. Please check your email and password.\"}",
                    "application/json"
            );
            return;
        }

        // Login successful
        String jsonResponse = String.format(
                "{\"userId\": \"%s\", \"username\": \"%s\", \"email\": \"%s\", \"role\": \"%s\"}",
                storedUser.getUserId(),
                storedUser.getUsername(),
                storedUser.getEmail(),
                storedUser.getRole()
        );

        ResponseUtil.sendResponse(exchange, 200, jsonResponse, "application/json");
    }

    private <T> T readRequestBody(HttpExchange exchange, Class<T> classOfT) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
             BufferedReader br = new BufferedReader(isr)) {

            return gson.fromJson(br, classOfT);
        }
    }
}