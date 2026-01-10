package com.handycraft.handlers;


import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class CartHandler implements HttpHandler {

    private final Gson gson = new Gson();

    // Data model for an item in the cart
    static class CartItem {
        String userEmail;
        String id;
        String name;
        double price;
        int quantity;
    }

    // Data model for the entire cart object sent from the client
    static class CartRequest {
        List<CartItem> items;
        double total;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if ("POST".equals(exchange.getRequestMethod())) {
            handlePost(exchange);
        } else {
            sendResponse(exchange, 405, "Method Not Allowed");
        }
    }

    private void handlePost(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8)) {
            // Read and parse the JSON cart data from the request body
            CartRequest cartRequest = gson.fromJson(isr, CartRequest.class);

            // Simple server-side validation/processing
            double calculatedTotal = cartRequest.items.stream()
                    .mapToDouble(item -> item.price * item.quantity)
                    .sum();

            // Logic for saving the order to orders.json
            String response = "Order processed successfully! Total: RM " + String.format("%.2f", calculatedTotal);
            sendResponse(exchange, 200, response);

        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
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