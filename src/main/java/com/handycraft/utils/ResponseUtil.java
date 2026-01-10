package com.handycraft.utils;

import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class ResponseUtil {

    public static void sendResponse(HttpExchange exchange, int statusCode, String response, String contentType) throws IOException {

        // Convert the String response to bytes using UTF-8
        byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
        long responseLength = responseBytes.length;

        // Set Content-Type header
        exchange.getResponseHeaders().set("Content-Type", contentType);

        // Send headers with the *exact* calculated byte length
        exchange.sendResponseHeaders(statusCode, responseLength);

        // Write the content bytes to the output stream
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }
}