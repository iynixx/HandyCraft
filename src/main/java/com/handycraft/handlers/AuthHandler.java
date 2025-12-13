package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.models.LoginRequest;
import com.handycraft.models.RegisterRequest;
import com.handycraft.models.User;
import com.handycraft.services.UserService;
import com.handycraft.utils.HashUtil;
import com.handycraft.utils.ResponseUtil;


import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class AuthHandler implements HttpHandler {
    private final Gson gson = new Gson();
    private final UserService userService = new UserService();

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

        // Let UserService handle password hashing with salt
        User newUser = userService.registerUser(
                request.getUsername(),
                request.getEmail(),
                request.getPassword()  // Send PLAIN password
        );

        if (newUser != null) {
            String jsonResponse = "{\"userId\": \"" + newUser.getUserId() + "\", \"username\": \"" + newUser.getUsername() + "\"}";
            ResponseUtil.sendResponse(exchange, 201, jsonResponse, "application/json");
        } else {
            ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"Registration failed. Invalid data.\"}", "application/json");
        }
    }

    // --- Login Logic (UPDATED to include ROLE) ---
    // handlers/AuthHandler.java - LOGIN METHOD
    private void handleLogin(HttpExchange exchange) throws IOException {
        LoginRequest credentials = readRequestBody(exchange, LoginRequest.class);

        // Use the NEW authenticateUser method
        User storedUser = userService.authenticateUser(
                credentials.getEmail(),
                credentials.getPassword()
        );

        if (storedUser == null) {
            ResponseUtil.sendResponse(exchange, 401,
                    "{\"message\": \"Invalid email or password.\"}",
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

    // --- Helper to read and deserialize JSON from the request body ---
    private <T> T readRequestBody(HttpExchange exchange, Class<T> classOfT) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
             BufferedReader br = new BufferedReader(isr)) {

            return gson.fromJson(br, classOfT);
        }
    }
}