package com.handycraft.handlers;

import com.google.gson.Gson;
import com.sun.net.httpserver.*;
import com.handycraft.models.Feedback;
import com.handycraft.services.FeedbackService;
import com.handycraft.utils.ResponseUtil;
import java.io.*;

public class FeedbackHandler implements HttpHandler {
    private final FeedbackService service = new FeedbackService();
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        String method = exchange.getRequestMethod();

        if ("GET".equals(method)) {
            String productId = exchange.getRequestURI().getQuery().split("=")[1];
            ResponseUtil.sendResponse(exchange, 200, gson.toJson(service.getFeedbackByProduct(productId)), "application/json");
        }
        else if ("POST".equals(method)) {
            InputStreamReader isr = new InputStreamReader(exchange.getRequestBody());
            Feedback fb = gson.fromJson(isr, Feedback.class);
            service.addFeedback(fb);
            ResponseUtil.sendResponse(exchange, 201, "{\"status\":\"success\"}", "application/json");
        }
    }
}