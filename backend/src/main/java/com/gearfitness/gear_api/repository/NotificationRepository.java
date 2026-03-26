package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.PostComment;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository
  extends JpaRepository<Notification, UUID>
{
  List<Notification> findByRecipient_UserIdOrderByCreatedAtDesc(UUID userId);

  long countByRecipient_UserIdAndIsReadFalse(UUID userId);

  void deleteAllByPost(Post post);

  void deleteAllByCommentIn(Collection<PostComment> comments);
}
