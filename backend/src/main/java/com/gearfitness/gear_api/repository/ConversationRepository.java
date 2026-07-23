package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Conversation;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository
  extends JpaRepository<Conversation, UUID> {
  /**
   * Look up an existing 1:1 thread by its canonical pair key so a given pair
   * never ends up with two DIRECT conversations.
   */
  Optional<Conversation> findByDirectKey(String directKey);
}
