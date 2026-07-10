package com.gearfitness.gear_api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Servlet-level body-size guard for the AI photo-estimate endpoint. The image
 * arrives inline as base64 inside a JSON body, so without this a hostile
 * caller could make Jackson buffer an arbitrarily large request before
 * AiPhotoNutritionService ever sees it. Rejecting on Content-Length here means
 * an oversized body is never read at all. The service still enforces the real
 * decoded-bytes ceiling; this is only the coarse outer bound.
 *
 * Runs before the security filter chain so the response is written directly
 * and cannot be rewritten by the auth entry point. Declining a request based
 * on its declared size leaks nothing to unauthenticated callers.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AiPhotoBodySizeFilter extends OncePerRequestFilter {

  /**
   * Matched with PathPatternRequestMatcher rather than a raw getRequestURI()
   * string compare: the matcher parses the request the same way Spring MVC's
   * PathPatternParser does (per-segment percent-decoding), so an encoded
   * variant like /estim%61te cannot skip the filter yet still route to the
   * controller.
   */
  private static final RequestMatcher PHOTO_ESTIMATE_MATCHER =
    PathPatternRequestMatcher.withDefaults().matcher(
      HttpMethod.POST,
      "/api/nutrition/ai/photo/estimate"
    );

  /**
   * 4MB of image is ~5.4MB of base64; the rest is headroom for the JSON
   * envelope (mime type, note, quoting).
   */
  private static final long MAX_CONTENT_LENGTH = 6L * 1024 * 1024;

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain filterChain
  ) throws ServletException, IOException {
    long contentLength = request.getContentLengthLong();
    if (contentLength < 0) {
      // Chunked / no declared length: refuse rather than buffer blind.
      reject(
        response,
        HttpServletResponse.SC_LENGTH_REQUIRED,
        "AI_LENGTH_REQUIRED"
      );
      return;
    }
    if (contentLength > MAX_CONTENT_LENGTH) {
      reject(
        response,
        HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
        "AI_IMAGE_TOO_LARGE"
      );
      return;
    }
    filterChain.doFilter(request, response);
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    try {
      return !PHOTO_ESTIMATE_MATCHER.matches(request);
    } catch (RuntimeException e) {
      // Undecodable path (malformed percent sequence). Fail closed: run the
      // filter rather than let a URI we cannot parse skip the size guard.
      return false;
    }
  }

  private void reject(HttpServletResponse response, int status, String code)
    throws IOException {
    response.setStatus(status);
    response.setContentType("application/json");
    response.getWriter().write("{\"error\": \"" + code + "\"}");
  }
}
