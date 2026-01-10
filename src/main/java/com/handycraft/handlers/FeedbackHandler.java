package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.*;
import com.handycraft.models.Feedback;
import com.handycraft.models.Order;
import com.handycraft.services.FeedbackService;
import com.handycraft.services.OrderService;
import com.handycraft.utils.ResponseUtil;
import java.io.*;
import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class FeedbackHandler implements HttpHandler {
    private final FeedbackService service = new FeedbackService();
    private final OrderService orderService = new OrderService();
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        setCorsHeaders(exchange);
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        if ("OPTIONS".equals(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }
        try {
            if ("GET".equals(method)) {
                //admin can access to all feedback
                if (path.contains("/admin/feedback")) {
                    List<Feedback> allFeedback = service.getAllFeedback();
                    ResponseUtil.sendResponse(exchange, 200, gson.toJson(allFeedback), "application/json");
                } else {
                    handleGetProductFeedback(exchange);
                }
            }
            else if ("POST".equals(method)) {
                handlePostVerifiedFeedback(exchange);
            }
            else if ("DELETE".equals(method)) {
                handleDeleteFeedback(exchange, path);
            }
        } catch (Exception e) {
            System.err.println("Feedback Error: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\":\"Error processing request\"}", "application/json");
        }
    }

    private void handlePostVerifiedFeedback(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody())) {
            Feedback fb = gson.fromJson(isr, Feedback.class);

            if (fb.getUserEmail() == null || fb.getProductId() == null) {
                ResponseUtil.sendResponse(exchange, 400, "{\"message\":\"Incomplete data\"}", "application/json");
                return;
            }

            //verify against orders.json using the hidden email field
            List<Order> userOrders = orderService.getOrdersByUserId(fb.getUserEmail());

            boolean hasPurchased = userOrders.stream()
                    .filter(o -> "Completed".equalsIgnoreCase(o.getStatus()))
                    .anyMatch(o -> o.getPurchaseProductIds().contains(fb.getProductId()));

            if (hasPurchased) {
                if (fb.getId() == null) fb.setId(UUID.randomUUID().toString());
                //generate timestamp when feedback is created
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
                String timestamp = LocalDateTime.now().format(formatter);
                fb.setTimestamp(timestamp);
                service.addFeedback(fb);
                ResponseUtil.sendResponse(exchange, 201, "{\"status\":\"success\"}", "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 403,
                        "{\"message\":\"Only customers who have purchased and received this item can leave a review.\"}",
                        "application/json");
            }
        }
    }

    private void handleGetProductFeedback(HttpExchange exchange) throws IOException {
        String query = exchange.getRequestURI().getQuery();
        if (query == null || !query.contains("productId=")) {
            ResponseUtil.sendResponse(exchange, 400, "{\"message\":\"Missing productId\"}", "application/json");
            return;
        }
        String productId = query.split("=")[1];
        List<Feedback> reviews = service.getFeedbackByProduct(productId);
        double average = service.getAverageRating(productId);
        List<Map<String, Object>> safeReviews = reviews.stream().map(fb -> {
            Map<String, Object> map = new HashMap<>();
            map.put("username", fb.getUsername());
            map.put("rating", fb.getRating());
            map.put("comment", fb.getComment());
            map.put("timestamp", fb.getTimestamp());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("reviews", safeReviews);
        responseData.put("average", average);
        ResponseUtil.sendResponse(exchange, 200, gson.toJson(responseData), "application/json");
    }

    private void handleDeleteFeedback(HttpExchange exchange, String path) throws IOException {
        String[] pathParts = path.split("/");
        String feedbackId = pathParts[pathParts.length - 1];
        boolean success = service.deleteFeedback(feedbackId);
        int statusCode = success ? 200 : 404;
        String msg = success ? "deleted" : "not found";
        ResponseUtil.sendResponse(exchange, statusCode, "{\"message\":\"Feedback " + msg + "\"}", "application/json");
    }

    private void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, X-User-ID");
    }
}