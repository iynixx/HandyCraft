package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.services.UserService;
import com.handycraft.utils.ResponseUtil;
import com.handycraft.utils.HashUtil;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.HashMap;

public class PasswordResetHandler implements HttpHandler {
    private final Gson gson = new Gson();
    private final UserService userService = new UserService();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        // Handle CORS preflight
        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        try {
            String pathSegment = path.substring(path.lastIndexOf('/'));

            switch (pathSegment) {
                case "/questions":
                    handleGetQuestions(exchange);
                    break;
                case "/reset":
                    handleResetPassword(exchange);
                    break;
                default:
                    ResponseUtil.sendResponse(exchange, 404,
                            "{\"message\": \"Endpoint Not Found\"}", "application/json");
                    break;
            }
        } catch (Exception e) {
            e.printStackTrace();
            ResponseUtil.sendResponse(exchange, 500,
                    "{\"message\": \"Internal Server Error\"}", "application/json");
        }
    }

    private void handleGetQuestions(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Map<String, String> request = gson.fromJson(isr, Map.class);
            String email = request.get("email");

            if (email == null || email.isEmpty()) {
                ResponseUtil.sendResponse(exchange, 400,
                        "{\"message\": \"Email is required\"}", "application/json");
                return;
            }

            // Checks if user exists and has security answers
            if(!userService.hasSecurityAnswers(email)){
                ResponseUtil.sendResponse(exchange, 404,
                        "{\"message\": \"User not found or security answers not set up\"}", "application/json");
                return;
            }

            // Get questions from constants
            Map<String, String> questions = userService.getSecurityQuestions();

            String jsonResponse = gson.toJson(questions);
            ResponseUtil.sendResponse(exchange, 200, jsonResponse, "application/json");

        } catch (Exception e) {
            System.err.println("Error getting security questions: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500,
                    "{\"message\": \"Failed to process request\"}", "application/json");
        }
    }

    private void handleResetPassword(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Map<String, String> request = gson.fromJson(isr, Map.class);

            String email = request.get("email");
            String answer1 = request.get("answer1");
            String answer2 = request.get("answer2");
            String answer3 = request.get("answer3");
            String newPassword = request.get("newPassword");
            String confirmPassword = request.get("confirmPassword");

            // Validate inputs
            if (email == null || answer1 == null || answer2 == null || answer3 == null ||
                    newPassword == null || confirmPassword == null) {
                ResponseUtil.sendResponse(exchange, 400,
                        "{\"message\": \"All fields are required\"}", "application/json");
                return;
            }

            // Check password match
            if (!newPassword.equals(confirmPassword)) {
                ResponseUtil.sendResponse(exchange, 400,
                        "{\"message\": \"Passwords do not match\"}", "application/json");
                return;
            }

            // Validate password strength
            if (newPassword.length() < 8 || newPassword.length() > 15) {
                ResponseUtil.sendResponse(exchange, 400,
                        "{\"message\": \"Password must be 8-15 characters\"}", "application/json");
                return;
            }

            if (!newPassword.matches(".*\\d.*") ||
                    !newPassword.matches(".*[A-Z].*") ||
                    !newPassword.matches(".*[a-z].*") ||
                    newPassword.contains(" ")) {
                ResponseUtil.sendResponse(exchange, 400,
                        "{\"message\": \"Password must contain at least 1 number, 1 uppercase, 1 lowercase letter, and no spaces\"}", "application/json");
                return;
            }

            // Verify answers (EXACT MATCH)
            boolean answersCorrect = userService.verifySecurityAnswers(email, answer1, answer2, answer3);

            if (!answersCorrect) {
                ResponseUtil.sendResponse(exchange, 401,
                        "{\"message\": \"Incorrect security answers\"}", "application/json");
                return;
            }

            // Reset password
            boolean success = userService.resetPassword(email, newPassword);

            if (success) {
                ResponseUtil.sendResponse(exchange, 200,
                        "{\"message\": \"Password reset successfully\"}", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 400,
                        "{\"message\": \"Failed to reset password\"}", "application/json");
            }

        } catch (Exception e) {
            System.err.println("Error resetting password: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500,
                    "{\"message\": \"Failed to reset password\"}", "application/json");
        }
    }
}