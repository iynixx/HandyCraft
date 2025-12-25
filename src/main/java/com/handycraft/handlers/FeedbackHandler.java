package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.*;
import com.handycraft.models.Feedback;
import com.handycraft.services.FeedbackService;
import com.handycraft.utils.ResponseUtil;
import java.io.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FeedbackHandler implements HttpHandler {
    private final FeedbackService service = new FeedbackService();
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, X-User-ID");

        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        if ("OPTIONS".equals(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }
        try {
            if ("GET".equals(method)) {
                // Check if it's the Admin list (no query) or User list (query)
                if (path.contains("/admin/feedback")) {
                    List<Feedback> allFeedback = service.getAllFeedback();
                    ResponseUtil.sendResponse(exchange, 200, gson.toJson(allFeedback), "application/json");
                } else {
                    handleGetProductFeedback(exchange);
                }
            }
            else if ("POST".equals(method)) {
                InputStreamReader isr = new InputStreamReader(exchange.getRequestBody());
                Feedback fb = gson.fromJson(isr, Feedback.class);
                service.addFeedback(fb);
                ResponseUtil.sendResponse(exchange, 201, "{\"status\":\"success\"}", "application/json");
            }
            else if ("DELETE".equals(method)) {
                String[] pathParts = path.split("/");
                String feedbackId = pathParts[pathParts.length - 1];
                boolean success = service.deleteFeedback(feedbackId);
                int statusCode = success ? 200 : 404;
                String msg = success ? "deleted" : "not found";
                ResponseUtil.sendResponse(exchange, statusCode, "{\"message\":\"Feedback " + msg + "\"}", "application/json");
            }
        } catch (Exception e) {
            //e.printStackTrace();
            System.err.println("Feedback Error: " + e.getMessage());
            ResponseUtil.sendResponse(exchange, 500, "{\"message\":\"Error processing request\"}", "application/json");
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

    Map<String, Object> responseData = new HashMap<>();
    responseData.put("reviews", reviews);
    responseData.put("average", average);
    ResponseUtil.sendResponse(exchange, 200, gson.toJson(responseData), "application/json");
}
public boolean deleteFeedback(String id) {
    List<Feedback> allFeedback = getAllFeedback(); // Load your existing data
    // Assuming your Feedback model has a getId() method
    boolean removed = allFeedback.removeIf(fb -> fb.getId().equals(id));

    if (removed) {
        saveAllFeedback(allFeedback); // This method must write the List back to your .json file
        return true;
    }
    return false;
}

public List<Feedback> getAllFeedback() {
    // Your existing logic to load the entire feedback.json file
    return loadAllFeedback();
}

}
        /*if ("GET".equals(method)) {
            String productId = exchange.getRequestURI().getQuery().split("=")[1];

            // Get both the list and the average from the service
            List<Feedback> reviews = service.getFeedbackByProduct(productId);
            double average = service.getAverageRating(productId);

            // Create a small wrapper object to send both
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("reviews", reviews);
            responseData.put("average", average);

            ResponseUtil.sendResponse(exchange, 200, gson.toJson(responseData), "application/json");
        }*/
        /*else if ("POST".equals(method)) {
            InputStreamReader isr = new InputStreamReader(exchange.getRequestBody());
            Feedback fb = gson.fromJson(isr, Feedback.class);
            service.addFeedback(fb);
            ResponseUtil.sendResponse(exchange, 201, "{\"status\":\"success\"}", "application/json");
        }*/

