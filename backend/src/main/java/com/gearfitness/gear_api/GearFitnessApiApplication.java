package com.gearfitness.gear_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GearFitnessApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(GearFitnessApiApplication.class, args);
  }
}
