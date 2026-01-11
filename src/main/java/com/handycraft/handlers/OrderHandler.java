package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.services.OrderService;
import com.handycraft.utils.ResponseUtil;
import com.handycraft.models.Order;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Date;
import java.text.SimpleDateFormat;
import java.util.UUID;

public class OrderHandler implements HttpHandler {
    private final OrderService orderService = OrderService.getInstance();
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();

        // Handle CORS
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        // Receive POST request from Checkout page
        if (method.equalsIgnoreCase("POST")) {
            try {
                // Read the incoming order JSON
                Order newOrder = gson.fromJson(new InputStreamReader(exchange.getRequestBody()), Order.class);

                // === 1. SET DEFAULT STATUS ===
                if (newOrder.getStatus() == null || newOrder.getStatus().isEmpty()) {
                    newOrder.setStatus("Pending");
                }

                // === 2. SET ORDER ID ===
                if (newOrder.getOrderId() == null || newOrder.getOrderId().isEmpty()) {
                    newOrder.setOrderId("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                }

                // === 3. SET ORDER DATE (Required for Sales Report) ===
                if (newOrder.getOrderDate() == null || newOrder.getOrderDate().isEmpty()) {
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm");
                    newOrder.setOrderDate(sdf.format(new Date()));
                }

                // Call the service
                orderService.saveOrder(newOrder);

                // If successful, send 201 Created
                ResponseUtil.sendResponse(exchange, 201, "{\"message\": \"Order placed successfully!\"}", "application/json");

            } catch (IOException e) {
                // This specifically catches the "Insufficient stock" error from your OrderService
                String errorMessage = e.getMessage();
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"" + errorMessage + "\"}", "application/json");
            } catch (Exception e) {
                // This catches any other unexpected server errors
                System.err.println("Error: " + e.getMessage());
                ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"An unexpected server error occurred.\"}", "application/json");
            }
        }

        if (method.equalsIgnoreCase("GET")) {
            String query = exchange.getRequestURI().getQuery();
            String userId = null;

            if (query != null && query.contains("userId=")) {
                userId = query.split("userId=")[1];
            }

            if (userId == null) {
                ResponseUtil.sendResponse(exchange, 400,
                        "{\"message\":\"Missing userId\"}", "application/json");
                return;
            }

            String ordersJson = gson.toJson(orderService.getOrdersByUserId(userId));
            ResponseUtil.sendResponse(exchange, 200, ordersJson, "application/json");
        }

        // Handle wrong HTTP methods
        else {
            ResponseUtil.sendResponse(exchange, 405, "{\"message\": \"Method Not Allowed\"}", "application/json");
        }
    }
}