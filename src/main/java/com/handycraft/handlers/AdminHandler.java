package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.services.ProductService;
import com.handycraft.services.UserService;
import com.handycraft.utils.ResponseUtil;
import com.handycraft.models.Product;
import com.handycraft.models.User;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

public class AdminHandler implements HttpHandler {

    // --- Dependencies ---
    private final UserService userService = UserService.getInstance();
    private final ProductService productService = new ProductService();
    private final Gson gson = new Gson();

    // --- RBAC Implementation ---
    private boolean checkAdminAccess(HttpExchange exchange) {
        List<String> userIdHeaders = exchange.getRequestHeaders().get("X-User-ID");

        if (userIdHeaders == null || userIdHeaders.isEmpty()) {
            return false;
        }

        String userId = userIdHeaders.get(0);

        try {
            User user = userService.findUserById(userId);
            // Only allow access if the user exists and has the 'admin' role
            return user != null && "admin".equals(user.getRole());
        } catch (Exception e) {
            System.err.println("Error during Admin access check: " + e.getMessage());
            return false;
        }
    }

    // --- CORS Helper ---
    private void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, X-User-ID");
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        final String ADMIN_BASE = "/api/admin";

        // Handle preflight CORS request
        if (method.equalsIgnoreCase("OPTIONS")) {
            setCorsHeaders(exchange);
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        setCorsHeaders(exchange);

        // 1. *** SECURITY CHECK ***
        if (!checkAdminAccess(exchange)) {
            ResponseUtil.sendResponse(exchange, 403,
                    "{\"message\": \"Access Denied: Admin privileges required.\"}",
                    "application/json");
            return;
        }

        try {
            // 2. Routing Logic
            if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/stats")) {
                handleGetStats(exchange);
            }
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/products")) {
                handleGetProducts(exchange);
            }
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/users")) {
                handleGetUsers(exchange);
            }
            else if (method.equalsIgnoreCase("POST") && path.equals(ADMIN_BASE + "/products")) {
                handleAddProduct(exchange);
            }
            else if (method.equalsIgnoreCase("PUT") && path.startsWith(ADMIN_BASE + "/products/")) {
                String id = path.substring((ADMIN_BASE + "/products/").length());
                handleUpdateProduct(exchange, id);
            }
            else if (method.equalsIgnoreCase("DELETE") && path.startsWith(ADMIN_BASE + "/products/")) {
                String id = path.substring((ADMIN_BASE + "/products/").length());
                handleDeleteProduct(exchange, id);
            }
            else if (method.equalsIgnoreCase("PUT") && path.startsWith(ADMIN_BASE + "/role/")) {
                String id = path.substring((ADMIN_BASE + "/role/").length());
                handleUpdateUserRole(exchange, id);
            }
            else {
                ResponseUtil.sendResponse(exchange, 404,
                        "{\"message\": \"Admin Endpoint Not Found\"}", "application/json");
            }
        } catch (Exception e) {
            e.printStackTrace();
            ResponseUtil.sendResponse(exchange, 500,
                    "{\"message\": \"Internal Server Error in Admin Handler.\"}",
                    "application/json");
        }
    }

    // ======================================================================
    // PRIVATE HANDLER METHODS
    // ======================================================================

    private void handleGetStats(HttpExchange exchange) throws IOException {
        try {
            List<User> allUsers = userService.getAllUsers();
            List<Product> allProducts = productService.loadAllProducts();

            Map<String, Integer> stats = new HashMap<>();
            stats.put("totalProducts", allProducts.size());
            stats.put("registeredUsers", allUsers.size());
            stats.put("pendingOrders", 5); // Placeholder for now

            ResponseUtil.sendResponse(exchange, 200, gson.toJson(stats), "application/json");
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to retrieve stats.\"}", "application/json");
        }
    }

    private void handleGetProducts(HttpExchange exchange) throws IOException {
        try {
            String productsJson = gson.toJson(productService.loadAllProducts());
            ResponseUtil.sendResponse(exchange, 200, productsJson, "application/json");
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to load products.\"}", "application/json");
        }
    }

    private void handleGetUsers(HttpExchange exchange) throws IOException {
        try {
            List<User> users = userService.getAllUsers();
            ResponseUtil.sendResponse(exchange, 200, gson.toJson(users), "application/json");
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to retrieve user list.\"}", "application/json");
        }
    }

    private void handleAddProduct(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Product newProduct = gson.fromJson(isr, Product.class);
            if (newProduct.getName() == null || newProduct.getPrice() <= 0) {
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"Product name and price are required.\"}", "application/json");
                return;
            }
            Product addedProduct = productService.addProduct(newProduct);
            ResponseUtil.sendResponse(exchange, 201, gson.toJson(addedProduct), "application/json");
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to add product.\"}", "application/json");
        }
    }

    private void handleUpdateProduct(HttpExchange exchange, String productId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Product updatedProduct = gson.fromJson(isr, Product.class);
            updatedProduct.setId(productId);

            boolean success = productService.updateProduct(updatedProduct);
            if (success) {
                ResponseUtil.sendResponse(exchange, 200, "{\"message\": \"Product updated successfully.\"}", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Product not found.\"}", "application/json");
            }
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to update product.\"}", "application/json");
        }
    }

    private void handleDeleteProduct(HttpExchange exchange, String productId) throws IOException {
        try {
            boolean success = productService.deleteProduct(productId);
            if (success) {
                ResponseUtil.sendResponse(exchange, 204, "", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Product not found.\"}", "application/json");
            }
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to delete product.\"}", "application/json");
        }
    }

    private void handleUpdateUserRole(HttpExchange exchange, String userId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Map<String, String> body = gson.fromJson(isr, Map.class);
            String newRole = body.get("role");

            // CRITICAL SECURITY: Prevent self-demotion
            String callerId = exchange.getRequestHeaders().getFirst("X-User-ID");
            if (userId.equals(callerId) && "customer".equals(newRole)) {
                ResponseUtil.sendResponse(exchange, 403,
                        "{\"message\": \"Cannot demote your own active admin account.\"}", "application/json");
                return;
            }

            boolean success = userService.updateUserRole(userId, newRole);
            if (success) {
                ResponseUtil.sendResponse(exchange, 200, "{\"message\": \"Role updated successfully.\"}", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"User not found.\"}", "application/json");
            }
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to update role.\"}", "application/json");
        }
    }
}