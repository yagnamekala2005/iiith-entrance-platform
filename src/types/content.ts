export type ContentStatus = "draft" | "review" | "published" | "archived";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq";
export type TestType = "practice" | "mock";

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

