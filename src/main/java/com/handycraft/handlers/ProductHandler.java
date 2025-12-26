package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.services.ProductService;
//import com.handycraft.services.FeedbackService;
import com.handycraft.utils.ResponseUtil;
import com.handycraft.models.Product;
import java.io.IOException;
import java.util.List;

public class ProductHandler implements HttpHandler {

    // Service dependency is now available
    private final ProductService productService = new ProductService();
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        // 1. Handle CORS preflight
        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        // Ensure all responses include the CORS header
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");

        // 2. Handle GET /api/products request
        if (method.equalsIgnoreCase("GET") && path.equals("/api/products")) {

            try {
                List<Product> products = productService.loadAllProducts();

                // If loading fails in the service, 'products' is an empty list,
                // which Gson converts to an empty JSON array: [] (safe for frontend)
                String jsonResponse = gson.toJson(products);

                ResponseUtil.sendResponse(exchange, 200, jsonResponse, "application/json");

            } catch (Exception e) {
                System.err.println("Error saving file after delete: " + e.getMessage());
                ResponseUtil.sendResponse(exchange, 500,
                        "{\"message\": \"Internal Server Error: Could not load products.\"}",
                        "application/json");
            }

        } else {
            // Handle requests for specific IDs (future enhancement) or wrong methods
            ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Endpoint Not Found\"}", "application/json");
        }
    }
}