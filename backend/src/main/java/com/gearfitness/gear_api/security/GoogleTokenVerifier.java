package com.gearfitness.gear_api.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GoogleTokenVerifier {

  @Value("${google.client-id}")
  private String clientId;

  @Value("${google.android-client-id:}")
  private String androidClientId;

  public GoogleIdToken.Payload verify(String idTokenString)
    throws GeneralSecurityException, IOException {
    List<String> audiences = new ArrayList<>();
    audiences.add(clientId);
    if (androidClientId != null && !androidClientId.isBlank()) {
      audiences.add(androidClientId);
    }

    GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
      new NetHttpTransport(),
      new GsonFactory()
    )
      .setAudience(audiences)
      .build();

    GoogleIdToken idToken = verifier.verify(idTokenString);
    if (idToken != null) {
      return idToken.getPayload();
    } else {
      throw new IllegalArgumentException("Invalid ID token.");
    }
  }
}
