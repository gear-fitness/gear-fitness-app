package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.PersonalRecordDTO;
import com.gearfitness.gear_api.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PersonalRecordService {

    private final EntityManager entityManager;
    private final WorkoutRepository workoutRepository;

    @Transactional(readOnly = true)
    public List<PersonalRecordDTO> getBigThreePRs(UUID userId) {
        // Query to get PRs prioritizing 1RM, falling back to highest weight
        String sql = """
            WITH ranked_lifts AS (
                SELECT 
                    e.name as exercise_name,
                    ws.weight_lbs,
                    ws.reps,
                    w.date_performed,
                    w.name as workout_name,
                    -- Prioritize 1RM (reps = 1), then by highest weight
                    ROW_NUMBER() OVER (
                        PARTITION BY e.name 
                        ORDER BY 
                            CASE WHEN ws.reps = 1 THEN 0 ELSE 1 END,
                            ws.weight_lbs DESC,
                            w.date_performed DESC
                    ) as rank
                FROM workout_set ws
                JOIN workout_exercise we ON ws.workout_exercise_id = we.workout_exercise_id
                JOIN exercise e ON we.exercise_id = e.exercise_id
                JOIN workout w ON we.workout_id = w.workout_id
                WHERE w.user_id = :userId
                  AND e.name IN ('Bench Press', 'Squat', 'Deadlift')
                  AND ws.weight_lbs IS NOT NULL
            )
            SELECT 
                exercise_name,
                weight_lbs,
                reps,
                date_performed,
                workout_name
            FROM ranked_lifts
            WHERE rank = 1
            ORDER BY exercise_name
            """;

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("userId", userId);
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        
        // Map to store the PR for each exercise
        Map<String, PersonalRecordDTO> bestPRs = new LinkedHashMap<>();
        
        for (Object[] row : results) {
            String exerciseName = (String) row[0];
            BigDecimal weight = (BigDecimal) row[1];
            Integer reps = (Integer) row[2];
            LocalDate date = ((java.sql.Date) row[3]).toLocalDate();
            String workoutName = (String) row[4];
            
            PersonalRecordDTO pr = new PersonalRecordDTO(
                exerciseName,
                weight,
                reps,
                date,
                workoutName
            );
            bestPRs.put(exerciseName, pr);
        }
        
        // Ensure all three exercises are represented, even if no data
        List<PersonalRecordDTO> result = new ArrayList<>();
        result.add(bestPRs.getOrDefault("Bench Press", 
            new PersonalRecordDTO("Bench Press", BigDecimal.ZERO, 0, null, null)));
        result.add(bestPRs.getOrDefault("Squat", 
            new PersonalRecordDTO("Squat", BigDecimal.ZERO, 0, null, null)));
        result.add(bestPRs.getOrDefault("Deadlift", 
            new PersonalRecordDTO("Deadlift", BigDecimal.ZERO, 0, null, null)));
        
        return result;
    }
}
