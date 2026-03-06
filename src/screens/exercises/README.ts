/**
 * EXERCISES
 *
 * Exercises are built via code, not the admin UI.
 * Each exercise type lives in its own file here.
 *
 * Planned structure:
 *   exercises/
 *     types/           ← TypeScript interfaces for exercise data
 *     interval/        ← Interval identification exercises
 *     chord/           ← Chord spelling / recognition
 *     voiceleading/    ← Voice leading exercises
 *     cadence/         ← Cadence identification
 *     ExerciseRunner.tsx  ← Shared runner/result screen
 *
 * Each exercise exports:
 *   - generateQuestion(): ExerciseQuestion
 *   - validateAnswer(q, answer): boolean
 *   - ExerciseScreen component
 */

export {};
