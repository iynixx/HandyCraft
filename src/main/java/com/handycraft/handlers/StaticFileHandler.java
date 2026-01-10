package com.handycraft.handlers;


import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.handycraft.utils.ResponseUtil;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class StaticFileHandler implements HttpHandler {
    private final String rootDirectory;

    public StaticFileHandler(String rootDirectory) {
        this.rootDirectory = rootDirectory;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        File file;

        // Determine the requested file path
        if (path.equals("/")) {
            // If the request is for the root context ("/"), serve index.html
            file = new File(rootDirectory, "index.html");
        } else {
            // For all other requests (e.g., /css/style.css, /images/logo.png), combine root and path
            file = new File(rootDirectory, path);
        }

        // Security Check
        Path resolvedPath = file.toPath().normalize();
        if (!resolvedPath.startsWith(new File(rootDirectory).toPath().normalize())) {
            ResponseUtil.sendResponse(exchange, 403, "Forbidden", "text/plain");
            return;
        }

        // Serve the file if it exists
        if (file.exists() && !file.isDirectory()) {
            String mimeType = Files.probeContentType(file.toPath());
            if (mimeType == null) {
                mimeType = "text/plain";
            }

            // Set headers and send the file content
            exchange.getResponseHeaders().set("Content-Type", mimeType);
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, file.length());

            try (FileInputStream fs = new FileInputStream(file);
                 OutputStream os = exchange.getResponseBody()) {

                final byte[] buffer = new byte[0x10000];
                int count;
                while ((count = fs.read(buffer)) >= 0) {
                    os.write(buffer, 0, count);
                }
            }
        } else {
            ResponseUtil.sendResponse(exchange, 404, "{\"message\": \"404 Not Found\"}", "application/json");
        }
    }
}