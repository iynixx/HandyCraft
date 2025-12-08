package com.handycraft.handlers;


import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class CartHandler implements HttpHandler {

    private final Gson gson = new Gson();

    // Data model for an item in the cart (matches client-side structure)
    static class CartItem {
        String id;
        String name;
        double price;
        int quantity;
    }

    // Data model for the entire cart object sent from the client
    static class CartRequest {
        List<CartItem> items;
        double total;
        // Optionally, add user details here
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if ("POST".equals(exchange.getRequestMethod())) {
            handlePost(exchange);
        } else {
            // Handle other methods (e.g., OPTIONS) or return 405
            sendResponse(exchange, 405, "Method Not Allowed");
        }
    }

    private void handlePost(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8)) {
            // 1. Read and parse the JSON cart data from the request body
            CartRequest cartRequest = gson.fromJson(isr, CartRequest.class);

            // 2. Simple server-side validation/processing (e.g., calculate total again)
            double calculatedTotal = cartRequest.items.stream()
                    .mapToDouble(item -> item.price * item.quantity)
                    .sum();

            // 3. Logic for saving the order to orders.json would go here...
            String response = "Order processed successfully! Total: RM " + String.format("%.2f", calculatedTotal);
            sendResponse(exchange, 200, response);

        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "Error processing cart data: " + e.getMessage());
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(statusCode, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
    }
}