package com.smartsms.score;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScoreStatsResponse {
    private String studentId;
    private double gpa;
    private int totalExams;
    private double avgScore;
    private double maxScore;
    private double minScore;
    private int rank;
    private int totalCredits;
}
