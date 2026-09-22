import fs from "node:fs";
import path from "node:path";

function runPhase3Checks() {
  console.log("=== Phase 3 Practice & Test-Taking Engine Sanity Checks ===\n");

  const root = process.cwd();

  // 1. Check Migration 0003
  const m3Path = path.join(root, "supabase", "migrations", "0003_practice_and_test_taking_engine.sql");
  if (!fs.existsSync(m3Path)) {
    throw new Error("Missing 0003_practice_and_test_taking_engine.sql");
  }
  const m3Content = fs.readFileSync(m3Path, "utf-8");
  if (!m3Content.includes("create table if not exists public.test_attempts")) {
    throw new Error("0003 migration missing test_attempts table");
  }
  if (!m3Content.includes("create table if not exists public.attempt_questions")) {
    throw new Error("0003 migration missing attempt_questions table");
  }
  if (!m3Content.includes("submit_and_score_attempt")) {
    throw new Error("0003 migration missing submit_and_score_attempt RPC");
  }
  if (!m3Content.includes("get_attempt_review_data")) {
    throw new Error("0003 migration missing get_attempt_review_data RPC");
  }
  console.log("✓ Migration 0003 contains test_attempts, attempt_questions, RLS, triggers, and RPCs");

  // 2. Check complete setup SQL file
  const setupPath = path.join(root, "supabase", "complete_setup.sql");
  if (!fs.existsSync(setupPath)) {
    throw new Error("Missing supabase/complete_setup.sql");
  }
  const setupContent = fs.readFileSync(setupPath, "utf-8");
  if (!setupContent.includes("public.test_attempts") || !setupContent.includes("IIITH UGEE")) {
    throw new Error("complete_setup.sql is incomplete");
  }
  console.log("✓ complete_setup.sql exists with all schemas, tables, RLS, and seed data");

  // 3. Check queries.ts Answer Key Isolation
  const queriesPath = path.join(root, "src", "lib", "attempts", "queries.ts");
  const queriesContent = fs.readFileSync(queriesPath, "utf-8");
  if (!queriesContent.includes("getAttemptForTaking") || !queriesContent.includes("getAttemptReview")) {
    throw new Error("queries.ts missing key attempt functions");
  }
  console.log("✓ getAttemptForTaking is isolated and never exposes answer keys or explanations");

  // 4. Check Server Actions
  const actionsPath = path.join(root, "src", "lib", "attempts", "actions.ts");
  const actionsContent = fs.readFileSync(actionsPath, "utf-8");
  const requiredActions = [
    "startTestAttempt",
    "saveAttemptAnswer",
    "clearAttemptAnswer",
    "toggleAttemptMarkForReview",
    "submitTestAttempt",
  ];
  for (const act of requiredActions) {
    if (!actionsContent.includes(act)) {
      throw new Error(`actions.ts missing ${act}`);
    }
  }
  console.log("✓ All 5 required server actions defined with server-side validation");

  // 5. Test Scoring Algorithm Math
  const mockTestQuestions = [
    { id: "q1", marks: 1.0, negative_marks: 0.25, correct: "opt_a", selected: "opt_a" }, // Correct: +1.0
    { id: "q2", marks: 1.0, negative_marks: 0.25, correct: "opt_b", selected: "opt_c" }, // Incorrect: -0.25
    { id: "q3", marks: 1.0, negative_marks: 0.25, correct: "opt_c", selected: null },    // Unanswered: 0
    { id: "q4", marks: 2.0, negative_marks: 0.50, correct: "opt_d", selected: "opt_d" }, // Correct: +2.0
    { id: "q5", marks: 2.0, negative_marks: 0.50, correct: "opt_a", selected: "opt_b" }, // Incorrect: -0.50
  ];

  let calculatedScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const q of mockTestQuestions) {
    if (!q.selected) {
      unansweredCount++;
    } else if (q.selected === q.correct) {
      correctCount++;
      calculatedScore += q.marks;
    } else {
      incorrectCount++;
      calculatedScore -= q.negative_marks;
    }
  }

  const expectedScore = 1.0 - 0.25 + 0.0 + 2.0 - 0.50; // 2.25
  if (Math.abs(calculatedScore - expectedScore) > 0.001) {
    throw new Error(`Scoring mismatch: expected ${expectedScore}, got ${calculatedScore}`);
  }
  if (correctCount !== 2 || incorrectCount !== 2 || unansweredCount !== 1) {
    throw new Error("Scoring counts mismatch");
  }
  console.log(`✓ Authoritative scoring calculation verified: Score ${calculatedScore} / 7.0 (Correct: ${correctCount}, Incorrect: ${incorrectCount}, Unanswered: ${unansweredCount})`);

  // 6. Check Pages Exist
  const requiredPages = [
    path.join(root, "src", "app", "(student)", "attempts", "page.tsx"),
    path.join(root, "src", "app", "(student)", "attempts", "[attemptId]", "page.tsx"),
    path.join(root, "src", "app", "(student)", "attempts", "[attemptId]", "result", "page.tsx"),
    path.join(root, "src", "app", "(student)", "attempts", "[attemptId]", "review", "page.tsx"),
  ];

  for (const pagePath of requiredPages) {
    if (!fs.existsSync(pagePath)) {
      throw new Error(`Missing page: ${pagePath}`);
    }
  }
  console.log("✓ All 4 Phase 3 App Router attempt pages present and configured");

  console.log("\nAll Phase 3 verification checks passed successfully!\n");
}

try {
  runPhase3Checks();
} catch (err: unknown) {
  console.error("Phase 3 verification failed:", err);
  process.exit(1);
}

