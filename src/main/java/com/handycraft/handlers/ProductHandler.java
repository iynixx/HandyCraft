package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.services.ProductService;
import com.handycraft.utils.ResponseUtil;
import com.handycraft.models.Product;
import java.io.IOException;
import java.util.List;

public class ProductHandler implements HttpHandler {
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

        // 2. Handle GET /api/products request
        if (method.equalsIgnoreCase("GET") && path.equals("/api/products")) {

            // The compiler now recognizes 'Product' thanks to the import
            List<Product> products = productService.loadAllProducts();

            // Serialize the List<Product> into a JSON array
            String jsonResponse = gson.toJson(products);

            // Send HTTP 200 OK with the product data
            ResponseUtil.sendResponse(exchange, 200, jsonResponse, "application/json");

        } else {
            // Handle requests for specific IDs (future enhancement) or wrong methods
            ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"Endpoint Not Found\"}", "application/json");
        }
    }
}