import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const m1 = fs.readFileSync(path.join(root, "supabase", "migrations", "0001_initial_schema.sql"), "utf-8");
const m2 = fs.readFileSync(path.join(root, "supabase", "migrations", "0002_content_and_question_bank.sql"), "utf-8");
const m3 = fs.readFileSync(path.join(root, "supabase", "migrations", "0003_practice_and_test_taking_engine.sql"), "utf-8");
const seed = fs.readFileSync(path.join(root, "supabase", "seed.sql"), "utf-8");

const banner = (title) => `\n\n-- ==========================================================================\n-- ${title}\n-- ==========================================================================\n\n`;

const completeSQL = [
  "-- IIITH ENTRANCE PREPARATION PLATFORM - COMPLETE DATABASE SETUP",
  "-- Run this script in the Supabase Dashboard -> SQL Editor -> Click 'Run'",
  banner("1. PHASE 1: INITIAL SCHEMA & AUTH PROFILES"),
  m1,
  banner("2. PHASE 2: CONTENT HIERARCHY, QUESTIONS, AND TESTS"),
  m2,
  banner("3. PHASE 3: PRACTICE & TEST TAKING ENGINE (ATTEMPTS, RLS, SCORING)"),
  m3,
  banner("4. SEED DATA: EXAMS, SECTIONS, 50 VERIFIED DEMO QUESTIONS & MOCK TESTS"),
  seed,
].join("\n");

const outputPath = path.join(root, "supabase", "complete_setup.sql");
fs.writeFileSync(outputPath, completeSQL, "utf-8");
console.log(`Successfully generated ${outputPath} (${(completeSQL.length / 1024).toFixed(1)} KB)`);

