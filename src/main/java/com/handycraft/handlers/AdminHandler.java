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
            return user != null && "admin".equals(user.getRole());

        } catch (Exception e) {
            System.err.println("Error during Admin access check: " + e.getMessage());
            return false;
        }
    }

    // --- CORS Helper ---
    private void setCorsHeaders(HttpExchange exchange, String allowedMethods) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", allowedMethods);
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, X-User-ID");
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        final String ADMIN_BASE_PATH = "/api/admin";
        final String ALL_METHODS = "GET, POST, PUT, DELETE, OPTIONS";

        if (method.equalsIgnoreCase("OPTIONS")) {
            setCorsHeaders(exchange, ALL_METHODS);
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        setCorsHeaders(exchange, ALL_METHODS);

        // *** SECURITY CHECK FIRST ***
        if (!checkAdminAccess(exchange)) {
            ResponseUtil.sendResponse(exchange, 403,
                    "{\"message\": \"Access Denied: Admin privileges required.\"}",
                    "application/json");
            return;
        }

        try {
            // --- 2. Handle GET /api/admin/stats ---
            if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE_PATH + "/stats")) {
                handleGetStats(exchange);
            }
            // --- 3. Handle GET /api/admin/products (Dashboard View) ---
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE_PATH + "/products")) {
                handleGetProducts(exchange);
            }
            // --- 4. Handle GET /api/admin/users ---
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE_PATH + "/users")) {
                handleGetUsers(exchange);
            }
            // --- 5. Handle POST /api/admin/products ---
            else if (method.equalsIgnoreCase("POST") && path.equals(ADMIN_BASE_PATH + "/products")) {
                handleAddProduct(exchange);
            }
            // --- 6. Handle PUT /api/admin/products/{productId} ---
            else if (method.equalsIgnoreCase("PUT") && path.startsWith(ADMIN_BASE_PATH + "/products/")) {
                handleUpdateProduct(exchange, path.substring(ADMIN_BASE_PATH.length() + "/products/".length()));
            }
            // --- 7. Handle DELETE /api/admin/products/{productId} ---
            else if (method.equalsIgnoreCase("DELETE") && path.startsWith(ADMIN_BASE_PATH + "/products/")) {
                handleDeleteProduct(exchange, path.substring(ADMIN_BASE_PATH.length() + "/products/".length()));
            }
            // --- 8. Handle PUT /api/admin/role/{userId} ---
            else if (method.equalsIgnoreCase("PUT") && path.startsWith(ADMIN_BASE_PATH + "/role/")) {
                handleUpdateUserRole(exchange, path.substring(ADMIN_BASE_PATH.length() + "/role/".length()));
            }
            // --- 9. Endpoint Not Found ---
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

    /**
     * Retrieves all products for the admin product management view.
     * Handles: GET /api/admin/products
     */
    private void handleGetProducts(HttpExchange exchange) throws IOException {
        try {
            // FIX: Use the correct method from ProductService
            String productsJson = gson.toJson(productService.loadAllProducts());

            ResponseUtil.sendResponse(exchange, 200, productsJson, "application/json");
        } catch (Exception e) {
            System.err.println("Error loading products for admin: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to load products.\"}", "application/json");
        }
    }

    private void handleGetStats(HttpExchange exchange) throws IOException {
        try {
            List<User> allUsers = userService.getAllUsers();
            // FIX: Use the correct method from ProductService
            List<Product> allProducts = productService.loadAllProducts();

            // Placeholder for pending orders count (replace with real logic later)
            int pendingOrdersCount = 5;

            Map<String, Integer> stats = new HashMap<>();
            stats.put("totalProducts", allProducts.size());
            stats.put("registeredUsers", allUsers.size());
            stats.put("pendingOrders", pendingOrdersCount);

            String jsonResponse = gson.toJson(stats);
            ResponseUtil.sendResponse(exchange, 200, jsonResponse, "application/json");
        } catch (Exception e) {
            System.err.println("Error fetching dashboard stats: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to retrieve stats.\"}", "application/json");
        }
    }

    private void handleGetUsers(HttpExchange exchange) throws IOException {
        try {
            List<User> users = userService.getAllUsers();
            String jsonResponse = gson.toJson(users);
            ResponseUtil.sendResponse(exchange, 200, jsonResponse, "application/json");
        } catch (Exception e) {
            System.err.println("Error fetching all users: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to retrieve user list.\"}", "application/json");
        }
    }

    private void handleUpdateUserRole(HttpExchange exchange, String userId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {

            Map<String, String> body = gson.fromJson(isr, Map.class);
            String newRole = body.get("role");

            if (userId == null || userId.isBlank()) {
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"User ID is required.\"}", "application/json");
                return;
            }
            if (newRole == null || (!newRole.equals("admin") && !newRole.equals("customer"))) {
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"Invalid role provided. Must be 'admin' or 'customer'.\"}", "application/json");
                return;
            }

            // ** ⭐️ CRITICAL SECURITY CHECK: Prevent Self-Demotion ⭐️ **
            List<String> callerIdHeaders = exchange.getRequestHeaders().get("X-User-ID");
            String callerId = callerIdHeaders != null && !callerIdHeaders.isEmpty() ? callerIdHeaders.get(0) : null;

            if (userId.equals(callerId) && newRole.equals("customer")) {
                ResponseUtil.sendResponse(exchange, 403,
                        "{\"message\": \"Cannot demote your own active admin account. Use another admin account to perform this action.\"}",
                        "application/json");
                return;
            }
            // *************************************************************

            boolean success = userService.updateUserRole(userId, newRole);

            if (success) {
                ResponseUtil.sendResponse(exchange, 200,
                        "{\"message\": \"Role updated successfully to " + newRole + "\"}",
                        "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"User not found.\"}", "application/json");
            }
        } catch (Exception e) {
            System.err.println("Error updating user role: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to update user role.\"}", "application/json");
        }
    }

    private void handleAddProduct(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {

            Product newProduct = gson.fromJson(isr, Product.class);

            if (newProduct.getName() == null || newProduct.getName().isBlank() || newProduct.getPrice() <= 0) {
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"Product name and price are required.\"}", "application/json");
                return;
            }

            Product addedProduct = productService.addProduct(newProduct);
            String jsonResponse = gson.toJson(addedProduct);

            ResponseUtil.sendResponse(exchange, 201, jsonResponse, "application/json");

        } catch (Exception e) {
            System.err.println("Error adding product: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to add product.\"}", "application/json");
        }
    }

    private void handleUpdateProduct(HttpExchange exchange, String productId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {

            if (productId == null || productId.isBlank()) {
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"Product ID is required in the path.\"}", "application/json");
                return;
            }

            Product updatedProduct = gson.fromJson(isr, Product.class);
            updatedProduct.setId(productId);

            boolean success = productService.updateProduct(updatedProduct);

            if (success) {
                ResponseUtil.sendResponse(exchange, 200, "{\"message\": \"Product updated successfully.\"}", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Product not found.\"}", "application/json");
            }

        } catch (Exception e) {
            System.err.println("Error updating product: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to update product.\"}", "application/json");
        }
    }

    private void handleDeleteProduct(HttpExchange exchange, String productId) throws IOException {
        try {
            if (productId == null || productId.isBlank()) {
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"Product ID is required in the path.\"}", "application/json");
                return;
            }

            boolean success = productService.deleteProduct(productId);

            if (success) {
                // Standard response for successful deletion with no body
                ResponseUtil.sendResponse(exchange, 204, "", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Product not found.\"}", "application/json");
            }

        } catch (Exception e) {
            System.err.println("Error deleting product: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Failed to delete product.\"}", "application/json");
        }
    }
}