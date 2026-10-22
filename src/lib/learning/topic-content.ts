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
    const parsed = JSON.parse(rawDescription) as Record<string, unknown>;
    if (parsed && typeof parsed === "object") {
      const rawResources = Array.isArray(parsed.resources) ? parsed.resources : [];

      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
        formulas: typeof parsed.formulas === "string" ? parsed.formulas : "",
        resources: rawResources.map((resource) => {
          const candidate = resource as Partial<Record<"title" | "url" | "type", unknown>>;
          const typeValue = candidate.type;

          return {
            title: String(candidate.title || "").trim(),
            url: String(candidate.url || "").trim(),
            type: typeof typeValue === "string" && ["pdf", "book", "formula_sheet", "notes", "link"].includes(typeValue)
              ? (typeValue as LearningResource["type"])
              : "pdf",
          };
        }),
        updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : undefined,
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
