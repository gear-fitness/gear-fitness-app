package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByUsername(String username);

     @Query("""
    SELECT u FROM AppUser u
    WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
""")

List<AppUser> searchByUsername(@Param("query") String query);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
