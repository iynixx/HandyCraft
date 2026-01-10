package com.handycraft.handlers;

import com.google.gson.Gson;
import com.handycraft.models.User;
import com.handycraft.services.UserService;
import com.handycraft.utils.ResponseUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;

public class ProfileHandler implements HttpHandler {
    private final UserService userService = UserService.getInstance();
    private final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();

        // CORS Headers
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        if (method.equalsIgnoreCase("OPTIONS")) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, X-User-ID");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        // Only allow GET requests
        if (method.equalsIgnoreCase("GET")) {
            String userId = exchange.getRequestHeaders().getFirst("X-User-ID");
            User user = userService.findUserById(userId);

            if (user != null) {
                // Return a safe version of the user (no passwords/salts)
                User safeUser = new User();
                safeUser.setUserId(user.getUserId());
                safeUser.setUsername(user.getUsername());
                safeUser.setEmail(user.getEmail());
                safeUser.setRole(user.getRole());

                ResponseUtil.sendResponse(exchange, 200, gson.toJson(safeUser), "application/json");
            } else {
                ResponseUtil.sendResponse(exchange, 404, "{\"message\":\"User not found\"}", "application/json");
            }
        }
    }
}