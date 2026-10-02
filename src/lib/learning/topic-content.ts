export interface LearningResource {
  title: string;
  url: string;
  type: "pdf" | "book" | "formula_sheet" | "notes" | "link";
}

export interface TopicLearningContent {
  summary?: string;
  explanation?: string;
  formulas?: string;
  resources?: LearningResource[];
  updated_at?: string;
}

/**
 * Safely parse a topic's description field.
 * Handles both rich JSON data and legacy plaintext summaries.
 */
export function parseTopicLearningContent(rawDescription?: string | null): TopicLearningContent {
  if (!rawDescription || !rawDescription.trim()) {
    return {
      summary: "",
      explanation: "",
      formulas: "",
      resources: [],
    };
  }

  try {
    const parsed = JSON.parse(rawDescription);
    if (parsed && typeof parsed === "object") {
      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
        formulas: typeof parsed.formulas === "string" ? parsed.formulas : "",
        resources: Array.isArray(parsed.resources)
          ? parsed.resources.map((r: any) => ({
              title: String(r.title || "").trim(),
              url: String(r.url || "").trim(),
              type: ["pdf", "book", "formula_sheet", "notes"].includes(r.type)
                ? (r.type as LearningResource["type"])
                : "pdf",
            }))
          : [],
        updated_at: parsed.updated_at,
      };
    }
  } catch {
    // Legacy plain string description
  }

  return {
    summary: rawDescription.trim(),
    explanation: "",
    formulas: "",
    resources: [],
  };
}

/**
 * Serialize rich topic learning content to JSON string for database storage.
 */
export function serializeTopicLearningContent(content: {
  summary?: string;
  explanation?: string;
  formulas?: string;
  resources?: LearningResource[];
}): string {
  return JSON.stringify({
    summary: content.summary || "",
    explanation: content.explanation || "",
    formulas: content.formulas || "",
    resources: (content.resources || []).filter((r) => r.title.trim() && r.url.trim()),
    updated_at: new Date().toISOString(),
  });
}
