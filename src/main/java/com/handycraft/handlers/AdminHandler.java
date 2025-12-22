package com.handycraft.handlers;

import com.google.gson.Gson;
import com.handycraft.models.Feedback;
import com.handycraft.services.FeedbackService;
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

    private final UserService userService = UserService.getInstance();
    private final ProductService productService = new ProductService();
    private final Gson gson = new Gson();

    private boolean checkAdminAccess(HttpExchange exchange) {
        List<String> userIdHeaders = exchange.getRequestHeaders().get("X-User-ID");
        if (userIdHeaders == null || userIdHeaders.isEmpty()) return false;

        String userId = userIdHeaders.get(0);
        try {
            User user = userService.findUserById(userId);
            return user != null && "admin".equals(user.getRole());
        } catch (Exception e) {
            return false;
        }
    }

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

        if (method.equalsIgnoreCase("OPTIONS")) {
            setCorsHeaders(exchange);
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        setCorsHeaders(exchange);

        if (!checkAdminAccess(exchange)) {
            ResponseUtil.sendResponse(exchange, 403, "{\"message\": \"Access Denied.\"}", "application/json");
            return;
        }

        try {
            if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/stats")) {
                handleGetStats(exchange);
            }
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/products")) {
                handleGetProducts(exchange);
            }
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/users")) {
                handleGetUsers(exchange);
            }
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/feedback")) {
                handleGetAllFeedback(exchange);
            }
            else if (method.equalsIgnoreCase("POST") && path.equals(ADMIN_BASE + "/products")) {
                handleSaveProduct(exchange, null);
            }
            else if (method.equalsIgnoreCase("PUT") && path.startsWith(ADMIN_BASE + "/products/")) {
                String id = path.substring((ADMIN_BASE + "/products/").length());
                handleSaveProduct(exchange, id);
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
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Not Found\"}", "application/json");
            }
        } catch (Exception e) {
            e.printStackTrace();
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Internal Error\"}", "application/json");
        }
    }

    private void handleSaveProduct(HttpExchange exchange, String productId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Map<String, Object> data = gson.fromJson(isr, Map.class);
            if (data == null) throw new Exception("Empty request body");

            Product product = new Product();
            if (productId != null) {
                product.setId(productId);
            }

            product.setName((String) data.get("Product Name"));
            product.setCategory((String) data.get("Category"));
            product.setDescription((String) data.get("Description"));

            // FIX: Using setImageUrl to match your Product.java model
            if (data.containsKey("File Name")) {
                product.setImageUrl((String) data.get("File Name"));
            }

            if (data.containsKey("Price (RM)")) {
                product.setPrice(Double.parseDouble(data.get("Price (RM)").toString()));
            }

            if (data.containsKey("Inventory")) {
                product.setInventory((Map<String, Integer>) data.get("Inventory"));
            }

            boolean success = (productId == null)
                    ? productService.addProduct(product) != null
                    : productService.updateProduct(product);

            ResponseUtil.sendResponse(exchange, success ? 200 : 400,
                    "{\"message\": \"" + (success ? "Success" : "Failed to save") + "\"}", "application/json");
        } catch (Exception e) {
            e.printStackTrace();
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Error processing data\"}", "application/json");
        }
    }

    private void handleGetStats(HttpExchange exchange) throws IOException {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("totalProducts", productService.loadAllProducts().size());
        stats.put("registeredUsers", userService.getAllUsers().size());
        stats.put("pendingOrders", 5);
        ResponseUtil.sendResponse(exchange, 200, gson.toJson(stats), "application/json");
    }

    private void handleGetProducts(HttpExchange exchange) throws IOException {
        ResponseUtil.sendResponse(exchange, 200, gson.toJson(productService.loadAllProducts()), "application/json");
    }

    private void handleGetUsers(HttpExchange exchange) throws IOException {
        ResponseUtil.sendResponse(exchange, 200, gson.toJson(userService.getAllUsers()), "application/json");
    }

    private void handleGetAllFeedback(HttpExchange exchange) throws IOException {
        ResponseUtil.sendResponse(exchange, 200, gson.toJson(new FeedbackService().getAllFeedback()), "application/json");
    }

    private void handleDeleteProduct(HttpExchange exchange, String productId) throws IOException {
        boolean success = productService.deleteProduct(productId);
        ResponseUtil.sendResponse(exchange, success ? 204 : 404, "", "application/json");
    }

    private void handleUpdateUserRole(HttpExchange exchange, String userId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Map<String, String> body = gson.fromJson(isr, Map.class);
            String newRole = body.get("role");
            boolean success = userService.updateUserRole(userId, newRole);
            ResponseUtil.sendResponse(exchange, success ? 200 : 404, "{}", "application/json");
        }
    }
}