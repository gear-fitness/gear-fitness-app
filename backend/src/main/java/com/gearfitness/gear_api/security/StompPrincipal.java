package com.gearfitness.gear_api.security;

import java.security.Principal;

/**
 * WebSocket session principal for a connected user. The name is the user's UUID
 * (as a string) so the server can address a recipient over Spring user
 * destinations with {@code convertAndSendToUser(userId, ...)} — mirroring how the
 * DM services already work in UUIDs. This is independent of the HTTP security
 * principal (which is keyed by email).
 */
public class StompPrincipal implements Principal {

  private final String name;

  public StompPrincipal(String name) {
    this.name = name;
  }

  @Override
  public String getName() {
    return name;
  }
}
