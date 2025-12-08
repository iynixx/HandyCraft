package com.handycraft.main;


import com.sun.net.httpserver.HttpServer;
import com.handycraft.handlers.AuthHandler;
import com.handycraft.handlers.ProductHandler;
import com.handycraft.handlers.StaticFileHandler;
import com.handycraft.handlers.CartHandler;

import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class Main {
    private static final int PORT = 8000;
    private static final String STATIC_ROOT = "src/main/resources/static";

    public static void main(String[] args) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

            // 1. Static File Handler: Handles all frontend assets (HTML, CSS, JS, Images)
            server.createContext("/", new StaticFileHandler(STATIC_ROOT));

            // 2. API Handlers: For business logic
            server.createContext("/api/auth", new AuthHandler());
            server.createContext("/api/products", new ProductHandler());
            server.createContext("/api/checkout", new CartHandler()); // Register the CartHandler for checkout

            // Server Configuration
            server.setExecutor(Executors.newFixedThreadPool(10));
            server.start();

            System.out.println("Handy Craft Server is running on: http://localhost:" + PORT);
            System.out.println("Static files served from: " + STATIC_ROOT); // Diagnostic Output

        } catch (Exception e) {
            System.err.println("FATAL ERROR: Could not start the HTTP Server.");
            e.printStackTrace();
        }
    }
}