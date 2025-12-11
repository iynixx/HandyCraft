package com.handycraft.utils;

import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class ResponseUtil {

    public static void sendResponse(HttpExchange exchange, int statusCode, String response, String contentType) throws IOException {

        // 1. Convert the String response to bytes using UTF-8
        byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
        long responseLength = responseBytes.length;

        // 2. Set Content-Type header
        exchange.getResponseHeaders().set("Content-Type", contentType);

        // 3. Send headers with the *exact* calculated byte length.
        // This is the critical fix for the "too many bytes" error.
        exchange.sendResponseHeaders(statusCode, responseLength);

        // 4. Write the content bytes to the output stream
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }
}