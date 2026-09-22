/**
 * Phase 2 Security & Content Layer Sanity Checks
 */
import fs from "fs";
import path from "path";

function runSanityChecks() {
  console.log("=== Phase 2 Security & Architecture Sanity Checks ===");
  let failed = false;

  // 1. Check .gitignore contains .env files
  const gitignorePath = path.resolve(process.cwd(), ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
    if (gitignoreContent.includes(".env*") || gitignoreContent.includes(".env.local")) {
      console.log("✓ .gitignore properly excludes .env.local");
    } else {
      console.error("✗ .gitignore does not exclude .env.local!");
      failed = true;
    }
  }

  // 2. Check no service-role key or secret key is exposed in NEXT_PUBLIC_ envs
  const envExamplePath = path.resolve(process.cwd(), ".env.example");
  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, "utf-8");
    if (envExample.includes("SERVICE_ROLE") || envExample.includes("secret")) {
      console.error("✗ .env.example contains secret keys!");
      failed = true;
    } else {
      console.log("✓ .env.example contains only public client keys");
    }
  }

  // 3. Check migration file exists and contains RLS policies
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/0002_content_and_question_bank.sql");
  if (fs.existsSync(migrationPath)) {
    const migrationContent = fs.readFileSync(migrationPath, "utf-8");
    const requiredTables = [
      "subjects",
      "chapters",
      "topics",
      "questions",
      "question_options",
      "question_answer_keys",
      "tests",
      "test_sections",
      "test_questions",
    ];

    for (const table of requiredTables) {
      if (!migrationContent.includes(`public.${table}`)) {
        console.error(`✗ Migration missing table: ${table}`);
        failed = true;
      }
    }

    if (
      migrationContent.includes("alter table public.question_answer_keys enable row level security") &&
      migrationContent.includes("Admins can read answer keys") &&
      !migrationContent.includes("Anyone can read answer keys")
    ) {
      console.log("✓ Protected answer keys table has strict Admin-only RLS policy");
    } else {
      console.error("✗ question_answer_keys RLS policy is not strictly admin-only!");
      failed = true;
    }
  } else {
    console.error("✗ Migration 0002_content_and_question_bank.sql not found!");
    failed = true;
  }

  // 4. Check seed.sql exists and contains 50 verified questions
  const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");
  if (fs.existsSync(seedPath)) {
    const seedContent = fs.readFileSync(seedPath, "utf-8");
    const suprCount = (seedContent.match(/supr-math|supr-phys|supr-chem/g) || []).length;
    const reapCount = (seedContent.match(/reap-q/g) || []).length;
    const specCount = (seedContent.match(/spec-pcm/g) || []).length;

    console.log(`✓ Seed contains ${suprCount} UGEE SUPR questions`);
    console.log(`✓ Seed contains ${reapCount} UGEE REAP questions`);
    console.log(`✓ Seed contains ${specCount} SPEC questions`);

    if (suprCount < 30 || reapCount < 10 || specCount < 10) {
      console.error("✗ Seed does not have full 50 verified questions!");
      failed = true;
    } else {
      console.log("✓ Full 50 verified demo questions present");
    }
  } else {
    console.error("✗ Seed file supabase/seed.sql not found!");
    failed = true;
  }

  // 5. Check queries do not select or return question_answer_keys to students
  const queriesPath = path.resolve(process.cwd(), "src/lib/content/queries.ts");
  if (fs.existsSync(queriesPath)) {
    const queriesContent = fs.readFileSync(queriesPath, "utf-8");
    if (queriesContent.includes("question_answer_keys")) {
      console.error("✗ Student query layer queries question_answer_keys directly!");
      failed = true;
    } else {
      console.log("✓ Student queries do not query question_answer_keys");
    }
  }

  if (failed) {
    console.error("\nSanity checks failed.");
    process.exit(1);
  } else {
    console.log("\nAll Phase 2 sanity checks passed successfully!");
  }
}

runSanityChecks();

