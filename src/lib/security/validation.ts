import Joi from "joi";

const uuid = Joi.string().guid({
  version: ["uuidv1", "uuidv2", "uuidv3", "uuidv4", "uuidv5"],
});

const optionSchema = Joi.object({
  label: Joi.string().trim().uppercase().valid("A", "B", "C", "D").required(),
  text: Joi.string().trim().min(1).max(20_000).required(),
}).unknown(false);

const questionOptions = Joi.array()
  .items(optionSchema)
  .min(2)
  .max(4)
  .unique("label")
  .required();

export const emailSchema = Joi.string().trim().lowercase().email().max(254).required();
export const passwordSchema = Joi.string().min(8).max(128).required();
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().min(1).max(128).required(),
}).unknown(false);
export const registrationSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
}).unknown(false);
export const recoveryRequestSchema = Joi.object({
  action: Joi.string().valid("send", "verify", "exchange").required(),
  email: emailSchema.optional(),
  token: Joi.string().trim().alphanum().min(6).max(12).optional(),
  code: Joi.string().trim().min(1).max(2048).optional(),
}).unknown(false).custom((value, helpers) => {
  if (value.action === "send" && !value.email) return helpers.error("any.required", { label: "email" });
  if (value.action === "verify" && (!value.email || !value.token)) return helpers.error("any.required");
  if (value.action === "exchange" && !value.code) return helpers.error("any.required");
  return value;
});
export const passwordUpdateSchema = Joi.object({
  password: passwordSchema,
}).unknown(false);

export const testOrderSchema = Joi.object({
  testId: uuid.required(),
}).unknown(false);
export const subscriptionOrderSchema = Joi.object({
  planId: uuid.required(),
}).unknown(false);
export const mockPaymentVerificationSchema = Joi.object({
  testId: uuid.required(),
  razorpay_order_id: Joi.string().trim().pattern(/^order_[A-Za-z0-9]+$/).max(64).required(),
  razorpay_payment_id: Joi.string().trim().pattern(/^pay_[A-Za-z0-9]+$/).max(64).required(),
  razorpay_signature: Joi.string().hex().length(64).required(),
}).unknown(false);
export const subscriptionPaymentVerificationSchema = Joi.object({
  razorpay_order_id: Joi.string().trim().pattern(/^order_[A-Za-z0-9]+$/).max(64).required(),
  razorpay_payment_id: Joi.string().trim().pattern(/^pay_[A-Za-z0-9]+$/).max(64).required(),
  razorpay_signature: Joi.string().hex().length(64).required(),
}).unknown(false);
export const paymentStatusQuerySchema = Joi.object({
  orderId: Joi.string().trim().pattern(/^order_[A-Za-z0-9]+$/).max(64).required(),
}).unknown(false);
export const razorpayWebhookSchema = Joi.object({
  event: Joi.string().min(1).max(100).required(),
  payload: Joi.object({
    payment: Joi.object({
      entity: Joi.object({
        id: Joi.string().pattern(/^pay_[A-Za-z0-9]+$/).max(64),
        order_id: Joi.string().pattern(/^order_[A-Za-z0-9]+$/).max(64),
        amount: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
        currency: Joi.string().length(3),
        status: Joi.string().max(32),
      }).unknown(true),
    }).unknown(true),
    order: Joi.object({
      entity: Joi.object({
        id: Joi.string().pattern(/^order_[A-Za-z0-9]+$/).max(64),
        amount: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
        currency: Joi.string().length(3),
        status: Joi.string().max(32),
      }).unknown(true),
    }).unknown(true),
  }).unknown(true),
}).unknown(true);
export const subscriptionPlanSchema = Joi.object({
  id: uuid.optional(),
  name: Joi.string().trim().min(1).max(80).required(),
  priceRupees: Joi.number().min(1).max(100_000).precision(2).required(),
  durationMonths: Joi.number().integer().min(1).max(24).required(),
  displayOrder: Joi.number().integer().min(0).max(10_000).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(false);
export const toggleSubscriptionPlanSchema = Joi.object({
  id: uuid.required(),
  isActive: Joi.boolean().required(),
}).unknown(false);

export const createQuestionSchema = Joi.object({
  subject_id: uuid.required(),
  chapter_id: uuid.allow(null).optional(),
  topic_id: uuid.allow(null).optional(),
  exam_id: uuid.allow(null).optional(),
  section_id: uuid.allow(null).optional(),
  question_text: Joi.string().trim().min(1).max(50_000).required(),
  difficulty: Joi.string().valid("easy", "medium", "hard").required(),
  explanation: Joi.string().allow("").max(50_000).required(),
  marks: Joi.number().min(0).max(10_000).required(),
  negative_marks: Joi.number().min(0).max(10_000).required(),
  options: questionOptions,
  correct_option_label: Joi.string().uppercase().valid("A", "B", "C", "D").required(),
  add_to_test_ids: Joi.array().items(uuid).max(100).optional(),
}).unknown(false).custom((value, helpers) => {
  if (!value.options.some((option: { label: string }) => option.label === value.correct_option_label)) {
    return helpers.error("any.invalid");
  }
  return value;
});
export const createPracticeQuestionSchema = Joi.object({
  subject_id: uuid.required(),
  chapter_id: uuid.required(),
  topic_id: uuid.required(),
  question_text: Joi.string().trim().min(1).max(50_000).required(),
  difficulty: Joi.string().valid("easy", "medium", "hard").required(),
  explanation: Joi.string().trim().min(1).max(50_000).required(),
  marks: Joi.number().min(0).max(10_000).required(),
  options: questionOptions.length(4),
  correct_option_label: Joi.string().uppercase().valid("A", "B", "C", "D").required(),
}).unknown(false);
export const practiceQuestionUpdateSchema = createPracticeQuestionSchema
  .fork(["subject_id", "chapter_id", "topic_id"], (schema) => schema.forbidden());
export const createMockTestSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  exam_id: uuid.required(),
  duration_minutes: Joi.number().integer().min(1).max(24 * 60).required(),
  description: Joi.string().allow("").max(10_000).optional(),
  test_type: Joi.string().valid("mock", "practice").optional(),
}).unknown(false);
export const nameDescriptionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().allow("").max(10_000).optional(),
}).unknown(false);
export const createExamSchema = nameDescriptionSchema.keys({
  negativeMarkingRatio: Joi.number().min(0).max(10).allow(null).optional(),
});
export const chapterCreateSchema = Joi.object({
  subject_id: uuid.required(),
  name: Joi.string().trim().min(1).max(120).required(),
}).unknown(false);
export const topicCreateSchema = Joi.object({
  chapter_id: uuid.required(),
  name: Joi.string().trim().min(1).max(120).required(),
}).unknown(false);
export const topicLearningContentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).optional(),
  summary: Joi.string().max(20_000).optional(),
  explanation: Joi.string().max(100_000).optional(),
  formulas: Joi.string().max(20_000).optional(),
  resources: Joi.array().items(Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    url: Joi.string().uri({ scheme: ["http", "https"] }).max(2048).required(),
    type: Joi.string().valid("pdf", "book", "formula_sheet", "notes", "link").required(),
  }).unknown(false)).max(50).optional(),
}).unknown(false);
export const cleanupConfirmationSchema = Joi.object({
  confirmation: Joi.string().valid("PURGE_OLD_TESTS").required(),
}).unknown(false);
export const adminEmailSchema = Joi.object({ email: emailSchema }).unknown(false);
export const idSchema = Joi.object({ id: uuid.required() }).unknown(false);

export function validateInput<T>(schema: Joi.Schema, input: unknown) {
  const result = schema.validate(input, {
    abortEarly: false,
    convert: true,
    stripUnknown: false,
  });

  return {
    value: result.error ? undefined : (result.value as T),
    error: result.error?.details.map((detail) => detail.message).join(" "),
  };
}
