package com.handycraft.handlers;

import com.google.gson.Gson;
//import com.handycraft.models.Feedback;
import com.handycraft.services.FeedbackService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.services.ProductService;
import com.handycraft.services.UserService;
import com.handycraft.utils.ResponseUtil;
import com.handycraft.models.Product;
import com.handycraft.models.User;
import com.handycraft.models.Order;
import com.handycraft.services.ActivityLogService;
//import com.handycraft.models.ActivityLog;
import com.handycraft.services.OrderService;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

public class AdminHandler implements HttpHandler {

    private final UserService userService = UserService.getInstance();
    private final ProductService productService = new ProductService();
    private final ActivityLogService activityLogService = new ActivityLogService();
    private final FeedbackService feedbackService = new FeedbackService();
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
            else if (method.equalsIgnoreCase("DELETE") && path.startsWith(ADMIN_BASE + "/feedback/")) {
                String feedbackId = path.substring((ADMIN_BASE + "/feedback/").length());
                handleDeleteFeedback(exchange, feedbackId);
            }
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/orders")) {
                handleGetOrders(exchange);
            }
            else if (method.equalsIgnoreCase("POST") && path.equals(ADMIN_BASE + "/logs")) {
                handleSaveLog(exchange);
            }
            else if (method.equalsIgnoreCase("GET") && path.equals(ADMIN_BASE + "/logs")) {
                handleGetLogs(exchange);
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
            else if (method.equalsIgnoreCase("PUT") && path.equals(ADMIN_BASE + "/orders/status")) {
                handleUpdateOrderStatus(exchange);
            }
            // Inside AdminHandler.java handle() method
            else if (method.equalsIgnoreCase("DELETE") && path.equals(ADMIN_BASE + "/logs")) {
                handleClearLogs(exchange);
            }
            else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Not Found\"}", "application/json");
            }
        } catch (Exception e) {
            //e.printStackTrace();
            System.err.println("Error: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Internal Error\"}", "application/json");
        }
    }

    private void handleSaveProduct(HttpExchange exchange, String productId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            //Map<String, Object> data = gson.fromJson(isr, Map.class);
            java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<Map<String, Object>>(){}.getType();
            Map<String, Object> data = gson.fromJson(isr, type);
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
                //product.setInventory((Map<String, Integer>) data.get("Inventory"));
                @SuppressWarnings("unchecked")
                Map<String, Integer> inventory = (Map<String, Integer>) data.get("Inventory");
                product.setInventory(inventory);
            }

            boolean success = (productId == null)
                    ? productService.addProduct(product) != null
                    : productService.updateProduct(product);

            ResponseUtil.sendResponse(exchange, success ? 200 : 400,
                    "{\"message\": \"" + (success ? "Success" : "Failed to save") + "\"}", "application/json");
        } catch (Exception e) {
            //e.printStackTrace();
            System.err.println("Error: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Error processing data\"}", "application/json");
        }
    }
    private final OrderService orderService = new OrderService();
    private void handleGetOrders(HttpExchange exchange) throws IOException {
        List<Order> orders = orderService.getAllOrders();
        // This uses your existing ResponseUtil to send the JSON back to the browser
        ResponseUtil.sendResponse(exchange, 200, gson.toJson(orders), "application/json");
    }
    private void handleSaveLog(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> data = gson.fromJson(isr, type);

            if (data == null) throw new Exception("Empty log body");

            com.handycraft.models.ActivityLog log = new com.handycraft.models.ActivityLog();
            log.setUsername(data.get("username"));
            log.setAction(data.get("action"));
            log.setDetails(data.get("details"));
            log.setTimestamp(data.get("timestamp"));

            activityLogService.addLog(log);
            ResponseUtil.sendResponse(exchange, 200, "{\"message\": \"Log saved\"}", "application/json");
        } catch (Exception e) {
            System.err.println("Error saving log: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Error saving log\"}", "application/json");
        }
    }

    private void handleGetLogs(HttpExchange exchange) throws IOException {
        List<com.handycraft.models.ActivityLog> logs = activityLogService.getAllLogs();
        ResponseUtil.sendResponse(exchange, 200, gson.toJson(logs), "application/json");
    }
    private void handleUpdateOrderStatus(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            //Map<String, String> body = gson.fromJson(isr, Map.class);
            java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<Map<String, Object>>(){}.getType();
            Map<String, String> body = gson.fromJson(isr, type);
            String orderId = body.get("orderId");
            String status = body.get("status");

            boolean success = orderService.updateOrderStatus(orderId, status);
            ResponseUtil.sendResponse(exchange, success ? 200 : 404, "{}", "application/json");
        }
    }

    private void handleGetStats(HttpExchange exchange) throws IOException {
        Map<String, Integer> stats = new HashMap<>();

        // Fetch real data from your services
        List<Order> allOrders = orderService.getAllOrders();
        List<User> allUsers = userService.getAllUsers();
        int totalProducts = productService.loadAllProducts().size();

        // 2. Calculate counts for every possible status
        int pending = 0;
        int processing = 0;
        int shipped = 0;
        int completed = 0;

        for (Order order : allOrders) {
            String status = order.getStatus();
            if ("Pending".equalsIgnoreCase(status)) pending++;
            else if ("Processing".equalsIgnoreCase(status)) processing++;
            else if ("Shipped".equalsIgnoreCase(status)) shipped++;
            else if ("Completed".equalsIgnoreCase(status)) completed++;
        }

        // 3. Populate the response map
        stats.put("totalProducts", totalProducts);
        stats.put("registeredUsers", allUsers.size());
        stats.put("totalOrders", allOrders.size());
        stats.put("pendingOrders", pending);
        stats.put("processingOrders", processing);
        stats.put("shippedOrders", shipped);
        stats.put("completedOrders", completed);

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
    private void handleClearLogs(HttpExchange exchange) throws IOException {
        try {
            // This is the call that makes the "unused" warning disappear
            activityLogService.clearAllLogs();
            ResponseUtil.sendResponse(exchange, 200, "{\"message\": \"Logs cleared successfully\"}", "application/json");
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Error clearing logs\"}", "application/json");
        }
    }

    private void handleUpdateUserRole(HttpExchange exchange, String userId) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            //Map<String, String> body = gson.fromJson(isr, Map.class);
            java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> body = gson.fromJson(isr, type);
            String newRole = body.get("role");
            //find the user being targeted for a role change
            User targetUser = userService.findUserById(userId);
            //check if the target user is David Lee
            if (targetUser != null && "David Lee".equals(targetUser.getUsername())) {
                // Block the update and send 403 Forbidden
                ResponseUtil.sendResponse(exchange, 403,
                        "{\"message\": \"Access Denied: The Super Admin role cannot be modified.\"}",
                        "application/json");
                return; // Stop execution here
            }
            boolean success = userService.updateUserRole(userId, newRole);
            ResponseUtil.sendResponse(exchange, success ? 200 : 404, "{}", "application/json");
        }
    }

    private void handleDeleteFeedback(HttpExchange exchange, String feedbackId) throws IOException {
        try {
            boolean success = feedbackService.deleteFeedback(feedbackId);
            if (success) {
                ResponseUtil.sendResponse(exchange, 200, "{\"message\": \"Feedback deleted successfully\"}", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Feedback not found\"}", "application/json");
            }
        } catch (Exception e) {
            ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"Error deleting feedback\"}", "application/json");
        }
    }
}