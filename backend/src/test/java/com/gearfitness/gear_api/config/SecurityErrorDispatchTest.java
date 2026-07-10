package com.gearfitness.gear_api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.security.JwtAuthenticationFilter;
import com.gearfitness.gear_api.security.JwtService;
import java.net.URI;
import java.util.Arrays;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Real-server regression test for the /error dispatch fix in SecurityConfig.
 * MockMvc never performs the container's ERROR dispatch, so this boots a real
 * Tomcat (minus the database slice) with the production SecurityConfig and
 * JwtAuthenticationFilter and asserts that a ResponseStatusException thrown
 * from a controller reaches the client with its real status instead of the
 * masked 401. Also covers the AiPhotoBodySizeFilter's oversize-body 413.
 */
@SpringBootTest(
  webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
  classes = SecurityErrorDispatchTest.TestApp.class
)
class SecurityErrorDispatchTest {

  @Configuration
  @EnableAutoConfiguration(
    exclude = {
      DataSourceAutoConfiguration.class,
      DataSourceTransactionManagerAutoConfiguration.class,
      HibernateJpaAutoConfiguration.class,
      JpaRepositoriesAutoConfiguration.class,
      FlywayAutoConfiguration.class,
    }
  )
  @Import(
    {
      SecurityConfig.class,
      JwtAuthenticationFilter.class,
      AiPhotoBodySizeFilter.class,
    }
  )
  static class TestApp {

    @RestController
    static class BoomController {

      @GetMapping("/api/boom/403")
      public String forbidden() {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AI_TIER");
      }

      @GetMapping("/api/boom/503")
      public String unavailable() {
        throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "AI_DAILY_LIMIT"
        );
      }
    }
  }

  private static final String TOKEN = "test-token";
  private static final String EMAIL = "tester@example.com";

  @MockitoBean
  private JwtService jwtService;

  @MockitoBean
  private AppUserRepository appUserRepository;

  @Autowired
  private TestRestTemplate rest;

  private HttpHeaders authedHeaders() {
    when(jwtService.extractEmail(TOKEN)).thenReturn(EMAIL);
    when(jwtService.isTokenValid(TOKEN, EMAIL)).thenReturn(true);
    when(appUserRepository.findByEmail(EMAIL)).thenReturn(
      Optional.of(AppUser.builder().email(EMAIL).passwordHash("hash").build())
    );
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(TOKEN);
    return headers;
  }

  @Test
  void responseStatusException403ReachesClientAs403() {
    ResponseEntity<String> response = rest.exchange(
      "/api/boom/403",
      HttpMethod.GET,
      new HttpEntity<>(authedHeaders()),
      String.class
    );
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
  }

  @Test
  void responseStatusException503ReachesClientAs503() {
    ResponseEntity<String> response = rest.exchange(
      "/api/boom/503",
      HttpMethod.GET,
      new HttpEntity<>(authedHeaders()),
      String.class
    );
    assertThat(response.getStatusCode()).isEqualTo(
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  @Test
  void unauthenticatedRequestStillGets401() {
    ResponseEntity<String> response = rest.getForEntity(
      "/api/boom/403",
      String.class
    );
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void oversizePhotoEstimateBodyRejectedWith413BeforeAuth() {
    byte[] oversized = new byte[7 * 1024 * 1024];
    Arrays.fill(oversized, (byte) 'a');
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> response = rest.exchange(
      "/api/nutrition/ai/photo/estimate",
      HttpMethod.POST,
      new HttpEntity<>(oversized, headers),
      String.class
    );
    assertThat(response.getStatusCode()).isEqualTo(
      HttpStatus.PAYLOAD_TOO_LARGE
    );
  }

  /**
   * Percent-encoded path variants decode to the same route in Spring MVC, so
   * the size filter must catch them too. A raw URI (not a template string)
   * keeps TestRestTemplate from re-encoding the %61, and the authed headers
   * prove the request would otherwise sail past security to the controller.
   */
  @Test
  void percentEncodedPhotoEstimatePathCannotBypassSizeFilter() {
    byte[] oversized = new byte[7 * 1024 * 1024];
    Arrays.fill(oversized, (byte) 'a');
    HttpHeaders headers = authedHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> response = rest.exchange(
      URI.create(rest.getRootUri() + "/api/nutrition/ai/photo/estim%61te"),
      HttpMethod.POST,
      new HttpEntity<>(oversized, headers),
      String.class
    );
    assertThat(response.getStatusCode()).isEqualTo(
      HttpStatus.PAYLOAD_TOO_LARGE
    );
  }
}
