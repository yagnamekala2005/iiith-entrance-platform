export type ContentStatus = "draft" | "review" | "published" | "archived";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq";
export type TestType = "practice" | "mock";
export type AttemptStatus = "in_progress" | "submitted" | "abandoned";
export type AttemptQuestionStatus = "unanswered" | "answered" | "skipped";

export interface Exam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  negative_marking_ratio: number | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamSection {
  id: string;
  exam_id: string;
  slug: string;
  name: string;
  description: string | null;
  default_duration_seconds: number;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface Topic {
  id: string;
  chapter_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface Question {
  id: string;
  exam_id: string | null;
  section_id: string | null;
  subject_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  explanation: string | null;
  marks: number;
  negative_marks: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_label: string;
  option_text: string;
  display_order: number;
  created_at: string;
}

export interface QuestionAnswerKey {
  question_id: string;
  correct_option_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithDetails extends Question {
  options: QuestionOption[];
  exam?: Exam | null;
  section?: ExamSection | null;
  subject?: Subject | null;
  chapter?: Chapter | null;
  topic?: Topic | null;
}

export interface Test {
  id: string;
  exam_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  test_type: TestType;
  duration_seconds: number;
  status: ContentStatus;
  instructions: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestSection {
  id: string;
  test_id: string;
  section_id: string;
  display_order: number;
  duration_seconds: number | null;
  marks_per_question: number | null;
  negative_marks: number | null;
  created_at: string;
  section?: ExamSection;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_id: string;
  section_id: string | null;
  display_order: number;
  marks: number;
  negative_marks: number;
  created_at: string;
  question?: QuestionWithDetails;
}

export interface TestWithDetails extends Test {
  exam?: Exam | null;
  sections: (TestSection & { section: ExamSection })[];
  total_questions: number;
  total_marks: number;
}

// ==========================================
// Phase 3: Practice & Test-Taking Interfaces
// ==========================================

export interface TestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  score: number;
  max_score: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  total_questions: number;
  created_at: string;
  updated_at: string;
  test?: TestWithDetails | null;
}

export interface AttemptQuestion {
  id: string;
  attempt_id: string;
  question_id: string;
  section_id: string | null;
  display_order: number;
  selected_option_id: string | null;
  status: AttemptQuestionStatus;
  marked_for_review: boolean;
  answered_at: string | null;
  marks: number;
  negative_marks: number;
  created_at: string;
  updated_at: string;
}

export interface AttemptQuestionTaking {
  id: string;
  attempt_id: string;
  question_id: string;
  section_id: string | null;
  section_name?: string;
  display_order: number;
  selected_option_id: string | null;
  status: AttemptQuestionStatus;
  marked_for_review: boolean;
  marks: number;
  negative_marks: number;
  question_text: string;
  difficulty: Difficulty;
  options: QuestionOption[];
}

export interface AttemptForTaking {
  attempt: TestAttempt;
  test: TestWithDetails;
  questions: AttemptQuestionTaking[];
}

export interface AttemptSectionResult {
  section_id: string;
  section_name: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  score: number;
  max_score: number;
}

export interface AttemptResult {
  attempt: TestAttempt;
  test: Test;
  accuracy_percentage: number;
  section_results: AttemptSectionResult[];
}

export interface AttemptReviewQuestion {
  id: string;
  question_id: string;
  section_id: string | null;
  section_name?: string;
  display_order: number;
  question_text: string;
  difficulty: Difficulty;
  marks: number;
  negative_marks: number;
  options: QuestionOption[];
  selected_option_id: string | null;
  correct_option_id: string;
  is_correct: boolean;
  is_unanswered: boolean;
  score_awarded: number;
  explanation: string | null;
}

export interface AttemptReview {
  attempt: TestAttempt;
  test: Test;
  questions: AttemptReviewQuestion[];
  section_results: AttemptSectionResult[];
}
