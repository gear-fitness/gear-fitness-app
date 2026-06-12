package com.gearfitness.gear_api.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import jakarta.annotation.PostConstruct;
import java.net.URL;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Verifies Apple-issued identity tokens (JWTs) received from the iOS client
 * during Sign In with Apple. Performs signature verification against Apple's
 * rotating JWKS, plus issuer / audience / expiry checks.
 *
 * Apple publishes JWKS at https://appleid.apple.com/auth/keys. Keys are cached
 * and refreshed automatically by the Nimbus RemoteJWKSet.
 */
@Component
public class AppleTokenVerifier {

  private static final String APPLE_ISSUER = "https://appleid.apple.com";
  private static final String APPLE_JWKS_URL =
    "https://appleid.apple.com/auth/keys";

  /**
   * The audience claim Apple includes in identity tokens — matches your iOS
   * app's bundle identifier (e.g. com.gearfitness.gear).
   */
  @Value("${apple.bundle-id}")
  private String bundleId;

  private ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

  @PostConstruct
  void init() throws Exception {
    JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(
      new URL(APPLE_JWKS_URL)
    );

    // Apple signs with RS256
    JWSKeySelector<SecurityContext> keySelector =
      new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource);

    ConfigurableJWTProcessor<SecurityContext> processor =
      new DefaultJWTProcessor<>();
    processor.setJWSKeySelector(keySelector);
    this.jwtProcessor = processor;
  }

  /**
   * Verifies an Apple identity token and returns its claims if valid.
   * Throws if the token is malformed, has an invalid signature, is expired,
   * or has the wrong issuer/audience.
   */
  public JWTClaimsSet verify(String identityToken) throws Exception {
    JWTClaimsSet claims = jwtProcessor.process(identityToken, null);

    if (!APPLE_ISSUER.equals(claims.getIssuer())) {
      throw new SecurityException(
        "Invalid Apple token issuer: " + claims.getIssuer()
      );
    }

    if (!claims.getAudience().contains(bundleId)) {
      throw new SecurityException(
        "Apple token audience does not match: expected " +
          bundleId +
          ", got " +
          claims.getAudience()
      );
    }

    // Expiry is checked automatically by the processor, but we can be explicit
    if (
      claims.getExpirationTime() != null &&
      claims.getExpirationTime().toInstant().isBefore(java.time.Instant.now())
    ) {
      throw new SecurityException("Apple token expired");
    }

    return claims;
  }
}
