package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.CreateRoutineDTO;
import com.gearfitness.gear_api.dto.CreateRoutineFromWorkoutDTO;
import com.gearfitness.gear_api.dto.RoutineDTO;
import com.gearfitness.gear_api.dto.UpdateRoutineDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.RoutineService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/routines")
@RequiredArgsConstructor
public class RoutineController {

  private final RoutineService routineService;
  private final JwtService jwtService;

  /**
   * Create a routine from scratch with a list of exercise IDs.
   */
  @PostMapping
  public ResponseEntity<RoutineDTO> createRoutine(
    @RequestBody CreateRoutineDTO dto,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      RoutineDTO routine = routineService.createRoutine(dto, userId);
      return ResponseEntity.status(HttpStatus.CREATED).body(routine);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Create a routine from an existing workout for the authenticated user.
   */
  @PostMapping("/from-workout")
  public ResponseEntity<RoutineDTO> createFromWorkout(
    @RequestBody CreateRoutineFromWorkoutDTO dto,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7); // Remove "Bearer "
      UUID userId = jwtService.extractUserId(token);

      RoutineDTO routine = routineService.createFromWorkout(dto, userId);
      return ResponseEntity.status(HttpStatus.CREATED).body(routine);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Get all routines for the authenticated user.
   */
  @GetMapping
  public ResponseEntity<List<RoutineDTO>> getUserRoutines(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      List<RoutineDTO> routines = routineService.getUserRoutines(userId);
      return ResponseEntity.ok(routines);
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Get a single routine's details (including exercises) for the authenticated user.
   */
  @GetMapping("/{routineId}")
  public ResponseEntity<RoutineDTO> getRoutineDetail(
    @PathVariable UUID routineId,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      RoutineDTO routine = routineService.getRoutineDetail(routineId, userId);
      return ResponseEntity.ok(routine);
    } catch (IllegalArgumentException e) {
      // Covers both "not found" and "unauthorized" from the service
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Get routines scheduled for "today" for the authenticated user.
   */
  @GetMapping("/today")
  public ResponseEntity<List<RoutineDTO>> getTodaysRoutines(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(required = false) String localDate
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      List<RoutineDTO> routines = routineService.getTodaysRoutines(
        userId,
        localDate
      );
      return ResponseEntity.ok(routines);
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Update a routine's name and/or scheduled days for the authenticated user.
   */
  @PutMapping("/{routineId}")
  public ResponseEntity<RoutineDTO> updateRoutine(
    @PathVariable UUID routineId,
    @RequestBody UpdateRoutineDTO dto,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      RoutineDTO updated = routineService.updateRoutine(routineId, dto, userId);
      return ResponseEntity.ok(updated);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Delete a routine owned by the authenticated user.
   */
  @DeleteMapping("/{routineId}")
  public ResponseEntity<Void> deleteRoutine(
    @PathVariable UUID routineId,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      routineService.deleteRoutine(routineId, userId);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }
}
