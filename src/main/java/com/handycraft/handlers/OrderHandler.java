package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.services.OrderService;
import com.handycraft.utils.ResponseUtil;
import com.handycraft.models.Order;
import java.io.IOException;
import java.io.InputStreamReader;

public class OrderHandler implements HttpHandler {
    private final OrderService orderService = new OrderService();
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();

        // 1. Handle CORS (Keep this exactly as it was)
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        // 2. Target 1: Receive POST request from Checkout page
        if (method.equalsIgnoreCase("POST")) {
            try {
                // Read the incoming order JSON
                Order newOrder = gson.fromJson(new InputStreamReader(exchange.getRequestBody()), Order.class);

                // Call the service (this now includes stock validation and reduction)
                orderService.saveOrder(newOrder);

                // If successful, send 201 Created
                ResponseUtil.sendResponse(exchange, 201, "{\"message\": \"Order placed successfully!\"}", "application/json");

            } catch (IOException e) {
                // This specifically catches the "Insufficient stock" error from your OrderService
                String errorMessage = e.getMessage();
                ResponseUtil.sendResponse(exchange, 400, "{\"message\": \"" + errorMessage + "\"}", "application/json");
            } catch (Exception e) {
                // This catches any other unexpected server errors
                e.printStackTrace();
                ResponseUtil.sendResponse(exchange, 500, "{\"message\": \"An unexpected server error occurred.\"}", "application/json");
            }
        }
        // 3. Keep this 'else' to handle wrong HTTP methods (like GET or DELETE)
        else {
            ResponseUtil.sendResponse(exchange, 405, "{\"message\": \"Method Not Allowed\"}", "application/json");
        }
    }
}