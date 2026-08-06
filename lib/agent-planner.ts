import "server-only";

import {
  getResolvedAnthropicApiKey,
  getResolvedGoogleApiKey,
  getResolvedNvidiaApiKey,
  getResolvedNovitaApiKey,
  getResolvedOpenAiApiKey,
  getResolvedOpenRouterApiKey,
} from "@/lib/ai-provider-settings";
import { getAnthropicModelId, isAnthropicModel } from "@/lib/anthropic";
import { getGoogleModelId, isGoogleModel } from "@/lib/google-ai";
import { getOpenAiModelId, isOpenAiModel } from "@/lib/openai-ai";
import { getOpenRouterModelId, isOpenRouterModel } from "@/lib/openrouter-ai";
import {
  getNvidiaModelId,
  isNvidiaModel,
  NVIDIA_API_BASE,
  NVIDIA_NEMOTRON_3_ULTRA_MODEL,
} from "@/lib/nvidia-ai";
import {
  getNovitaModelId,
  isNovitaModel,
  NOVITA_API_BASE,
} from "@/lib/novita-ai";

const MODELSLAB_PREFIX = "modelslab/";
const ONEMINI_MODEL_VALUE = "onemini";
const ONEMINI_MODEL_ID = "openai-gpt-5.4";
const LEGACY_BRAND_NAME = "Site" + "liyo";
const LEGACY_BRAND_NAME_LOWER = LEGACY_BRAND_NAME.toLowerCase();

export type AgentWorkflowStep = {
  title: string;
  description: string;
  type: "trigger" | "research" | "processing" | "delivery" | "action";
  integration?: string;
};

export type AgentPlan = {
  title: string;
  summary: string;
  trigger: {
    type: "manual" | "schedule" | "webhook";
    description: string;
  };
  workflow: AgentWorkflowStep[];
  requiredIntegrations: string[];
  setupQuestions: Array<{
    question: string;
    suggestedAnswer: string;
  }>;
  execution: {
    supportedNow: boolean;
    notes: string[];
  };
};

export type AgentBuilderMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildPublishedAgentBuilderReply({
  title,
  action = "created",
  askForName = true,
}: {
  title: string;
  plan: AgentPlan;
  action?: "created" | "updated";
  askForName?: boolean;
}) {
  const intro =
    action === "created"
      ? `${title} is published and ready to test.`
      : `Done - I updated and published ${title}.`;
  const polishLine =
    "It will use sensible defaults, complete the task in chat, and only ask for details if you explicitly want an external integration configured.";

  return [
    intro,
    askForName ? "What would you like to name this agent?" : polishLine,
  ].join("\n\n");
}

const AGENT_SYSTEM_PROMPT = `
You create automation agents for OneFlow.
Return only valid JSON. Do not wrap it in markdown.

The JSON must match this TypeScript shape:
{
  "title": string,
  "summary": string,
  "trigger": {
    "type": "manual" | "schedule" | "webhook",
    "description": string
  },
  "workflow": [
    {
      "title": string,
      "description": string,
      "type": "trigger" | "research" | "processing" | "delivery" | "action",
      "integration"?: string
    }
  ],
  "requiredIntegrations": string[],
  "setupQuestions": [
    { "question": string, "suggestedAnswer": string }
  ],
  "execution": {
    "supportedNow": boolean,
    "notes": string[]
  }
}

Rules:
- Create a real workflow plan for the user's requested agent.
- Include 3 to 6 workflow steps.
- The first step should usually be a trigger.
- Be honest about integrations and secrets needed.
- For Discord delivery, prefer Discord webhook unless the user explicitly asks for a bot token.
- Set execution.supportedNow true only when the first implementation can run manually with available safe inputs.
- setupQuestions are optional polish questions for the builder conversation, not hard requirements for the runtime agent.
- Do not use generic placeholders like "What should this agent do?" unless the user request is truly empty.
- suggestedAnswer should be a concrete likely answer inferred from the user's prompt, not dummy data.
- If a value is unknown, infer a practical default first. Ask a precise question only for credentials, legal permissions, paid accounts, or destructive external actions.
`.trim();

const AGENT_BUILDER_SYSTEM_PROMPT = `
You are OneFlow's agent builder inside an agent workspace.
Behave like a collaborative setup conversation, not a static form.

Your job:
- Greet the user naturally when appropriate.
- Improve the agent from the user's message and confirm the useful change you made.
- Ask a question only when the request cannot be applied safely or clearly without one.
- Base any question on the user's request, the current agent plan, and what is still unknown.
- Read the conversation carefully and do not repeat a question that was already asked or answered.
- Treat short direct replies as answers to the most recent question.
- Keep it short and conversational.
- Do not list a generic checklist.
- Do not claim the agent is published or finished unless the current runtime explicitly says it published.
- If the user asks for a news agent, infer a useful topic, recency window, source mix, schedule, or destination from context and proceed unless one missing fact truly blocks a safe update.

Return only valid JSON:
{
  "message": string
}
`.trim();

const AGENT_PUBLISH_SYSTEM_PROMPT = `
You create production system prompts for published OneFlow automation agents.
Return only valid JSON. Do not wrap it in markdown.

Return this shape:
{
  "systemPrompt": string
}

Rules:
- Write the final system prompt the runtime agent should follow after training.
- Transform the user's request into a complete operational agent prompt. Do not merely restate the request, summarize the plan, or produce a template wrapper.
- Preserve the user's requested purpose, schedule, destination, integrations, tone, constraints, and missing setup requirements from the conversation.
- Be specific and operational. Include what the agent should do, when it should act, what assumptions it should use by default, how it should respond, and what it must avoid.
- If the original request is short or vague, infer a high-quality default workflow for that agent type. The agent should act with autonomy, make reasonable assumptions, and produce a useful result without requiring extra user input.
- Include concrete sections for role, objective, operating assumptions, workflow, output format, and no-questions policy inside the systemPrompt value.
- Do not include a "required inputs" section, intake checklist, placeholder fields, forms, or language that makes the user fill in missing details before the agent works.
- Do not invent credentials, account IDs, channels, or secret values that were not provided.
- Missing credentials, channels, or destinations only disable external delivery. They never block a helpful in-chat result, draft, analysis, or preview.
- The published agent should sound like a normal helpful person doing the job, not a setup form. It should reply directly to casual or imperfect user messages, infer intent from context, and avoid interrogating the user.
- It may ask one concise question only when the user explicitly asks it to configure an external integration or when proceeding could cause irreversible harm.
- Do not mention that you are creating a prompt. The value must be the prompt itself.
`.trim();

const AGENT_TEST_RESPONSE_FORMAT_PROMPT = `
You are running a live test conversation for a published OneFlow agent.
Follow the published agent system prompt, but respond like a normal helpful person.
Respond directly to the user's test message as the agent.
Use the test message and the published prompt context to infer intent. If the user gives a vague but usable instruction, choose sensible defaults and provide a useful in-chat preview.
Ask only when the user explicitly wants external delivery configured, when a safety/privacy/legal/payment risk is involved, or when no useful work can begin without one factual answer.
Do not ask for destinations, credentials, or integration details unless the user specifically asks you to configure external delivery.
Do not mention test mode, rehearsal mode, setup status, missing credentials, destinations, or external delivery limitations.
Do not claim that integrations, tickets, calls, webhooks, databases, live searches, or external actions were completed unless the runtime provides evidence.

Return only valid JSON:
{
  "message": string
}
`.trim();

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? trimmed;
}

function repairJsonSeparators(input: string) {
  let output = "";
  let index = 0;
  let inString = false;
  let escaped = false;
  let previousToken = "";

  while (index < input.length) {
    const char = input[index] ?? "";

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
        previousToken = char;
      }
      index += 1;
      continue;
    }

    const canEndValue =
      previousToken === '"' ||
      previousToken === "}" ||
      previousToken === "]" ||
      previousToken === "e" ||
      previousToken === "l" ||
      /[0-9]/.test(previousToken);
    const canStartValue =
      char === '"' ||
      char === "{" ||
      char === "[" ||
      char === "-" ||
      char === "t" ||
      char === "f" ||
      char === "n" ||
      /[0-9]/.test(char);

    if (canEndValue && canStartValue) {
      output += ",";
      previousToken = ",";
    }

    output += char;

    if (char === '"') {
      inString = true;
      index += 1;
      continue;
    }

    if (!/\s/.test(char)) {
      previousToken = char;
      index += 1;
      continue;
    }

    let lookahead = index + 1;
    while (lookahead < input.length && /\s/.test(input[lookahead] ?? "")) {
      lookahead += 1;
    }

    const nextToken = input[lookahead] ?? "";
    const previousCanEndValue =
      previousToken === '"' ||
      previousToken === "}" ||
      previousToken === "]" ||
      previousToken === "e" ||
      previousToken === "l" ||
      /[0-9]/.test(previousToken);
    const nextCanStartValue =
      nextToken === '"' ||
      nextToken === "{" ||
      nextToken === "[" ||
      nextToken === "-" ||
      nextToken === "t" ||
      nextToken === "f" ||
      nextToken === "n" ||
      /[0-9]/.test(nextToken);

    if (previousCanEndValue && nextCanStartValue) {
      output += ",";
      previousToken = ",";
    }

    index += 1;
  }

  return output.replace(/,\s*([}\]])/g, "$1");
}

function parseModelJson(content: string) {
  const json = extractJson(content);
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    const repaired = repairJsonSeparators(json);
    try {
      return JSON.parse(repaired) as unknown;
    } catch {
      throw error;
    }
  }
}

function agentsDebugEnabled() {
  return process.env.AGENTS_DEBUG === "1";
}

function logAgentJsonParseFallback(
  message: string,
  error: unknown,
  content: string,
) {
  if (!agentsDebugEnabled()) return;
  console.warn(message, {
    error: error instanceof Error ? error.message : String(error),
    content: content.slice(0, 500),
  });
}

function logAgentEmptyFallback(message: string, model: string) {
  if (!agentsDebugEnabled()) return;
  console.warn(message, { model });
}

function getDefaultBuilderReply(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("discord")) {
    return "Great, I can help set that up. Which Discord webhook URL or channel should this agent send updates to?";
  }

  if (lowerPrompt.includes("email")) {
    return "Great, I can help set that up. Which email address should this agent send the results to?";
  }

  if (lowerPrompt.includes("news")) {
    return "Great, I can help set that up. How often should this agent check for fresh news?";
  }

  return "Great, I can help set that up. What schedule or trigger should this agent use?";
}

function useOneFlowBrand(value: string) {
  return value
    .replace(new RegExp(LEGACY_BRAND_NAME, "g"), "OneFlow")
    .replace(new RegExp(LEGACY_BRAND_NAME_LOWER, "g"), "oneflow");
}

function getFallbackPlan(prompt: string): AgentPlan {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("news")) {
    return {
      title: "News Briefing Agent",
      summary:
        "Find relevant news, verify the important details, and prepare concise briefings for the requested audience.",
      trigger: {
        type: "manual",
        description:
          "Run manually from OneFlow until a schedule or webhook trigger is configured.",
      },
      workflow: [
        {
          title: "Clarify Brief",
          description:
            "Infer a sensible brief from the user's message. Ask for one missing detail only when no useful topic or direction is available.",
          type: "trigger",
        },
        {
          title: "Collect News",
          description:
            "Use approved news sources or web search access to find recent items that match the requested topic and timeframe.",
          type: "research",
          integration: "News source or web search access",
        },
        {
          title: "Verify and Rank",
          description:
            "Compare sources, remove duplicates, prioritize credible recent items, and flag uncertainty or missing source details.",
          type: "processing",
        },
        {
          title: "Write Briefing",
          description:
            "Summarize the top stories with headlines, dates, source names, links when available, and why each item matters.",
          type: "processing",
        },
        {
          title: "Deliver Update",
          description:
            "Send the briefing to the configured destination, or return it in the workspace if no destination is configured.",
          type: "delivery",
        },
      ],
      requiredIntegrations: [
        "News source or web search access",
        "Delivery channel",
      ],
      setupQuestions: [
        {
          question:
            "Which news topic, companies, people, locations, or keywords should I track?",
          suggestedAnswer: "Track AI product launches and funding news.",
        },
        {
          question: "How fresh should the news be?",
          suggestedAnswer: "Only include stories from the last 24 hours.",
        },
        {
          question: "Where should I deliver the briefing?",
          suggestedAnswer: "Send it to a Discord or Slack channel.",
        },
      ],
      execution: {
        supportedNow: true,
        notes: [
          "Can draft in-chat briefings manually; automated delivery still needs source access and a destination.",
        ],
      },
    };
  }

  return {
    title: "Custom Automation Agent",
    summary: `Automate this request: ${prompt}`,
    trigger: {
      type: "manual",
      description:
        "Run manually from OneFlow until the user configures a schedule or external trigger.",
    },
    workflow: [
      {
        title: "Clarify Requirements",
        description:
          "Infer reasonable defaults from the user's message and ask one concise question only when a missing detail blocks useful progress.",
        type: "trigger",
      },
      {
        title: "Gather Context",
        description:
          "Use the request, configured integrations, and available data to collect the information needed for the task.",
        type: "research",
      },
      {
        title: "Process Task",
        description:
          "Apply the user's rules and constraints, then prepare the result in the requested format.",
        type: "processing",
      },
      {
        title: "Deliver Result",
        description:
          "Return the result in OneFlow or send it to the configured destination when one is available.",
        type: "delivery",
      },
    ],
    requiredIntegrations: [],
    setupQuestions: [
      {
        question:
          "What exact destination, schedule, and inputs should this agent use?",
        suggestedAnswer:
          "Run manually for now and return the result in the workspace.",
      },
    ],
    execution: {
      supportedNow: true,
      notes: [
        "Can provide in-chat previews manually; external actions still need the relevant credentials or integrations.",
      ],
    },
  };
}

function isGenericPlaceholderWorkflow(workflow: AgentWorkflowStep[]) {
  const joined = workflow
    .map((step) => `${step.title} ${step.description}`.toLowerCase())
    .join(" ");

  return (
    joined.includes("manual trigger") &&
    joined.includes("process request") &&
    joined.includes("deliver result") &&
    joined.includes("analyze the prompt")
  );
}

export function shouldRefreshPublishedAgentSystemPrompt(
  systemPrompt: string | null,
) {
  const prompt = systemPrompt?.trim() ?? "";
  if (!prompt) return true;

  const lowerPrompt = prompt.toLowerCase();

  return (
    lowerPrompt.includes(LEGACY_BRAND_NAME_LOWER) ||
    lowerPrompt.includes("required inputs:") ||
    lowerPrompt.includes("ask for exact inputs") ||
    lowerPrompt.includes("ask only one concise follow-up") ||
    (lowerPrompt.includes("original user request:") &&
      lowerPrompt.includes("setup requirements:") &&
      lowerPrompt.includes("none explicitly required yet") &&
      lowerPrompt.includes(
        "process request: analyze the prompt and prepare the result",
      ))
  );
}

function getDefaultPublishedSystemPrompt({
  title,
  prompt,
  plan,
  messages,
}: {
  title: string;
  prompt: string;
  plan: AgentPlan;
  messages: AgentBuilderMessage[];
}) {
  const fallbackPlan = getFallbackPlan(prompt);
  const effectiveTitle =
    title && title !== "Custom Agent" ? title : fallbackPlan.title;
  const effectiveSummary =
    plan.summary && plan.summary !== prompt
      ? plan.summary
      : fallbackPlan.summary;
  const effectiveTrigger =
    plan.trigger.description === `Run manually from ${LEGACY_BRAND_NAME}.` ||
    plan.trigger.description === "Run manually from OneFlow."
      ? fallbackPlan.trigger.description
      : useOneFlowBrand(plan.trigger.description);
  const effectiveWorkflow =
    plan.workflow.length > 0 &&
    !plan.workflow.some(
      (step) => step.description === "Run this workflow step.",
    ) &&
    !isGenericPlaceholderWorkflow(plan.workflow)
      ? plan.workflow
      : fallbackPlan.workflow;
  const effectiveQuestions =
    plan.setupQuestions.length > 0
      ? plan.setupQuestions
      : fallbackPlan.setupQuestions;
  const effectiveIntegrations =
    plan.requiredIntegrations.length > 0
      ? plan.requiredIntegrations
      : fallbackPlan.requiredIntegrations;
  const conversationNotes = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .slice(-6);
  const assumptions = effectiveQuestions
    .map((item) => useOneFlowBrand(item.suggestedAnswer || item.question))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
  const integrations =
    effectiveIntegrations.length > 0
      ? useOneFlowBrand(effectiveIntegrations.join(", "))
      : "No external integration is required unless the user asks the agent to take external action.";
  const workflow = effectiveWorkflow
    .map(
      (step, index) =>
        `${index + 1}. ${useOneFlowBrand(step.title)}: ${useOneFlowBrand(step.description)}`,
    )
    .join("\n");

  return useOneFlowBrand(
    `
You are ${effectiveTitle}, a OneFlow automation agent.

Role:
Act as a production-ready automation agent for this request: "${prompt}".

Objective:
${useOneFlowBrand(effectiveSummary)}

Trigger:
${effectiveTrigger}

Operating assumptions:
${assumptions || "- Use reasonable defaults from the user's message and the current conversation."}
- When the user gives a short or imperfect message, infer the most useful version of the task and proceed.
- If a destination, schedule, data source, or credential is missing, complete the task in chat using safe defaults instead of asking for setup details.
- Do not ask for exact inputs unless the user is configuring an external integration, requesting an irreversible action, or the task is impossible to start without one missing fact.

Workflow:
${workflow}

Required integrations:
${integrations}

Response format:
- Sound natural and helpful, like a person doing the job.
- Do the work directly. Do not start with an intake question, setup checklist, or "I need..." response.
- If setup is incomplete but the agent can still help in chat, make reasonable assumptions and provide the finished result, preview, draft, or analysis.
- Ask at most one concise question only when the user explicitly asks for external delivery setup or the missing detail creates a safety, privacy, legal, payment, or destructive-action risk.
- If the agent can act with the provided information, return a clear result with short sections, relevant context, and next steps.
- For research or news-style work, include source names or links when available, dates, and uncertainty notes instead of unsupported claims.
- If external delivery is unavailable, do not apologize or dwell on setup; provide the result in chat and mention external delivery only when the user asks.

Conversation context:
${conversationNotes.length > 0 ? conversationNotes.map((note) => `- ${note}`).join("\n") : "- No extra setup details were provided."}
`.trim(),
  );
}

function improveGeneratedPublishedSystemPrompt(systemPrompt: string) {
  const prompt = useOneFlowBrand(systemPrompt).trim();
  if (!prompt) return "";

  const withoutRequiredInputsHeading = prompt.replace(
    /^#{0,6}\s*Required inputs\s*:?\s*$/gim,
    "Operating assumptions:",
  );
  const withoutSetupFormLanguage = withoutRequiredInputsHeading
    .replace(
      /\bask(?:ing)? for (?:the )?(?:required|missing) inputs?\b/gi,
      "use sensible defaults",
    )
    .replace(/\brequire(?:s|d)? user input\b/gi, "uses reasonable assumptions")
    .replace(/\bmust ask (?:the )?user\b/gi, "should proceed")
    .replace(/\bdo not proceed until\b/gi, "proceed safely unless");

  const autonomyPolicy = `

Autonomy and no-questions policy:
- Start doing the requested work immediately. Do not begin with a setup form, intake checklist, or required-inputs request.
- Infer reasonable defaults from the agent purpose, current message, conversation context, and common professional practice.
- Missing destinations, schedules, credentials, account IDs, channels, or webhooks only block external delivery; they do not block an in-chat result, draft, analysis, or preview.
- Ask at most one concise question only when the user explicitly asks to configure an external integration, when a safety/privacy/legal/payment issue is involved, or when no useful work can begin without one factual answer.
- If external delivery is unavailable, provide the completed result in chat and keep setup notes brief.
`.trim();

  return `${withoutSetupFormLanguage}\n\n${autonomyPolicy}`;
}

function getDefaultTestReply({
  message,
  channelName,
}: {
  message: string;
  channelName: string;
}) {
  const normalizedMessage = message.trim();
  return `Here is a direct ${channelName} response:\n\n${normalizedMessage}`;
}

function getMessageFromTestReply(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return getMessageFromTestReply(parseModelJson(trimmed));
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (!value || typeof value !== "object") return "";

  const record = value as {
    message?: unknown;
    reply?: unknown;
    content?: unknown;
  };
  return (
    getMessageFromTestReply(record.message) ||
    getMessageFromTestReply(record.reply) ||
    getMessageFromTestReply(record.content)
  );
}

function removeTestBlockingGuardrails(systemPrompt: string) {
  return systemPrompt
    .replace(/\n+Guardrails:\n[\s\S]*$/i, "")
    .replace(
      /\n+- Follow the workflow above and be explicit about missing credentials, destinations, schedules, sources, or permissions\./gi,
      "",
    )
    .replace(
      /\n+- Missing credentials or destinations only block external delivery; they do not block a helpful in-chat response\./gi,
      "",
    )
    .replace(
      /\n+- When running manually, complete as much of the agent's purpose as possible in chat before mentioning any setup that is still needed\./gi,
      "",
    )
    .trim();
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePlan(value: unknown, prompt: string): AgentPlan {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const fallbackPlan = getFallbackPlan(prompt);
  const rawTrigger =
    raw.trigger && typeof raw.trigger === "object"
      ? (raw.trigger as Record<string, unknown>)
      : {};
  const triggerType =
    rawTrigger.type === "schedule" || rawTrigger.type === "webhook"
      ? rawTrigger.type
      : "manual";
  const rawWorkflow = Array.isArray(raw.workflow) ? raw.workflow : [];
  const workflow = rawWorkflow
    .map((step): AgentWorkflowStep | null => {
      if (!step || typeof step !== "object") return null;
      const rawStep = step as Record<string, unknown>;
      const type =
        rawStep.type === "trigger" ||
        rawStep.type === "research" ||
        rawStep.type === "processing" ||
        rawStep.type === "delivery" ||
        rawStep.type === "action"
          ? rawStep.type
          : "action";
      return {
        title: asString(rawStep.title, "Agent step"),
        description: asString(rawStep.description, "Run this workflow step."),
        type,
        integration:
          typeof rawStep.integration === "string" && rawStep.integration.trim()
            ? rawStep.integration.trim()
            : undefined,
      };
    })
    .filter((step): step is AgentWorkflowStep => Boolean(step))
    .slice(0, 6);

  return {
    title: useOneFlowBrand(asString(raw.title, fallbackPlan.title)),
    summary: useOneFlowBrand(asString(raw.summary, fallbackPlan.summary)),
    trigger: {
      type:
        rawTrigger.type === "schedule" || rawTrigger.type === "webhook"
          ? triggerType
          : fallbackPlan.trigger.type,
      description: useOneFlowBrand(
        asString(rawTrigger.description, fallbackPlan.trigger.description),
      ),
    },
    workflow:
      workflow.length > 0 && !isGenericPlaceholderWorkflow(workflow)
        ? workflow.map((step) => ({
            ...step,
            title: useOneFlowBrand(step.title),
            description: useOneFlowBrand(step.description),
            integration: step.integration
              ? useOneFlowBrand(step.integration)
              : undefined,
          }))
        : fallbackPlan.workflow,
    requiredIntegrations: Array.isArray(raw.requiredIntegrations)
      ? raw.requiredIntegrations
          .filter((item): item is string => typeof item === "string")
          .map((item) => useOneFlowBrand(item.trim()))
          .filter(Boolean)
          .slice(0, 8)
      : fallbackPlan.requiredIntegrations,
    setupQuestions: Array.isArray(raw.setupQuestions)
      ? raw.setupQuestions
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const rawItem = item as Record<string, unknown>;
            return {
              question: useOneFlowBrand(
                asString(
                  rawItem.question,
                  "Which exact account or channel should this agent use?",
                ),
              ),
              suggestedAnswer: useOneFlowBrand(
                asString(
                  rawItem.suggestedAnswer,
                  "Use the destination mentioned in the prompt.",
                ),
              ),
            };
          })
          .filter(
            (item): item is { question: string; suggestedAnswer: string } =>
              Boolean(item),
          )
          .slice(0, 4)
      : fallbackPlan.setupQuestions,
    execution: {
      supportedNow:
        Boolean(raw.execution) &&
        typeof raw.execution === "object" &&
        (raw.execution as Record<string, unknown>).supportedNow === true,
      notes:
        raw.execution &&
        typeof raw.execution === "object" &&
        Array.isArray((raw.execution as Record<string, unknown>).notes)
          ? ((raw.execution as Record<string, unknown>).notes as unknown[])
              .filter((item): item is string => typeof item === "string")
              .map((item) => useOneFlowBrand(item.trim()))
              .filter(Boolean)
              .slice(0, 5)
          : fallbackPlan.execution.notes,
    },
  };
}

async function callOpenAiCompatible({
  url,
  headers,
  model,
  prompt,
  systemPrompt = AGENT_SYSTEM_PROMPT,
  maxTokens = 1400,
}: {
  url: string;
  headers: Record<string, string>;
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}) {
  const isOpenAiDirect = url.includes("api.openai.com");
  const isNvidiaNemotronUltra =
    url.startsWith(NVIDIA_API_BASE) && model === NVIDIA_NEMOTRON_3_ULTRA_MODEL;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      ...(isOpenAiDirect
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens }),
      ...(isNvidiaNemotronUltra
        ? {
            top_p: 0.95,
            chat_template_kwargs: {
              enable_thinking: false,
              force_nonempty_content: true,
            },
          }
        : {}),
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `AI provider returned ${response.status}`);
  }

  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content ?? "");
}

async function callAnthropic(model: string, prompt: string) {
  const apiKey = await getResolvedAnthropicApiKey();
  if (!apiKey) throw new Error("Missing Anthropic API key.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: AGENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1400,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Anthropic returned ${response.status}`);
  }

  const payload = await response.json();
  return String(payload?.content?.[0]?.text ?? "");
}

async function callAnthropicWithSystem(
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens = 500,
) {
  const apiKey = await getResolvedAnthropicApiKey();
  if (!apiKey) throw new Error("Missing Anthropic API key.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Anthropic returned ${response.status}`);
  }

  const payload = await response.json();
  return String(payload?.content?.[0]?.text ?? "");
}

async function callGoogle(model: string, prompt: string) {
  const apiKey = await getResolvedGoogleApiKey();
  if (!apiKey) throw new Error("Missing Google API key.");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1400,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Google returned ${response.status}`);
  }

  const payload = await response.json();
  return String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

async function callGoogleWithSystem(
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens = 500,
) {
  const apiKey = await getResolvedGoogleApiKey();
  if (!apiKey) throw new Error("Missing Google API key.");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Google returned ${response.status}`);
  }

  const payload = await response.json();
  return String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

async function callModelslab(model: string, prompt: string) {
  const apiKey = process.env.MODELSLAB_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing MODELSLAB_API_KEY.");
  const response = await fetch(
    "https://modelslab.com/api/v7/llm/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: apiKey,
        model_id: model,
        messages: [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: false,
        temperature: 0.2,
        max_tokens: 1400,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Modelslab returned ${response.status}`);
  }

  const payload = await response.json();
  return String(
    payload?.choices?.[0]?.message?.content ??
      payload?.output?.[0]?.content ??
      payload?.data?.[0]?.content ??
      "",
  );
}

async function callModelslabWithSystem(
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens = 500,
) {
  const apiKey = process.env.MODELSLAB_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing MODELSLAB_API_KEY.");
  const response = await fetch(
    "https://modelslab.com/api/v7/llm/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: apiKey,
        model_id: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
        temperature: 0.35,
        max_tokens: maxTokens,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Modelslab returned ${response.status}`);
  }

  const payload = await response.json();
  return String(
    payload?.choices?.[0]?.message?.content ??
      payload?.output?.[0]?.content ??
      payload?.data?.[0]?.content ??
      "",
  );
}

export async function generateAgentPlan({
  prompt,
  model,
}: {
  prompt: string;
  model: string;
}) {
  let content = "";

  if (isOpenAiModel(model)) {
    const apiKey = await getResolvedOpenAiApiKey();
    if (!apiKey) throw new Error("Missing OpenAI API key.");
    content = await callOpenAiCompatible({
      url: "https://api.openai.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${apiKey}` },
      model: getOpenAiModelId(model),
      prompt,
    });
  } else if (isOpenRouterModel(model)) {
    const apiKey = await getResolvedOpenRouterApiKey();
    if (!apiKey) throw new Error("Missing OpenRouter API key.");
    content = await callOpenAiCompatible({
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://llamacoder.app",
        "X-Title": "OneFlow Agents",
      },
      model: getOpenRouterModelId(model),
      prompt,
    });
  } else if (isNvidiaModel(model)) {
    const apiKey = await getResolvedNvidiaApiKey();
    if (!apiKey) throw new Error("Missing NVIDIA API key.");
    content = await callOpenAiCompatible({
      url: `${NVIDIA_API_BASE}/chat/completions`,
      headers: { Authorization: `Bearer ${apiKey}` },
      model: getNvidiaModelId(model),
      prompt,
    });
  } else if (isNovitaModel(model)) {
    const apiKey = await getResolvedNovitaApiKey();
    if (!apiKey) throw new Error("Missing Novita AI API key.");
    content = await callOpenAiCompatible({
      url: `${NOVITA_API_BASE}/chat/completions`,
      headers: { Authorization: `Bearer ${apiKey}` },
      model: getNovitaModelId(model),
      prompt,
    });
  } else if (isAnthropicModel(model)) {
    content = await callAnthropic(getAnthropicModelId(model), prompt);
  } else if (isGoogleModel(model)) {
    content = await callGoogle(getGoogleModelId(model), prompt);
  } else if (model === ONEMINI_MODEL_VALUE) {
    content = await callModelslab(ONEMINI_MODEL_ID, prompt);
  } else if (model.startsWith(MODELSLAB_PREFIX)) {
    content = await callModelslab(model.slice(MODELSLAB_PREFIX.length), prompt);
  } else {
    throw new Error(`Unsupported agent model: ${model}`);
  }

  if (!content.trim()) {
    logAgentEmptyFallback(
      "[agents] provider returned an empty agent plan; using fallback plan",
      model,
    );
    return normalizePlan({}, prompt);
  }

  try {
    const parsed = parseModelJson(content);
    return normalizePlan(parsed, prompt);
  } catch (error) {
    logAgentJsonParseFallback(
      "[agents] failed to parse generated plan JSON",
      error,
      content,
    );
    return normalizePlan({}, prompt);
  }
}

async function callBuilderModel({
  model,
  prompt,
  systemPrompt = AGENT_BUILDER_SYSTEM_PROMPT,
  maxTokens = 700,
}: {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}) {
  if (isOpenAiModel(model)) {
    const apiKey = await getResolvedOpenAiApiKey();
    if (!apiKey) throw new Error("Missing OpenAI API key.");
    return callOpenAiCompatible({
      url: "https://api.openai.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${apiKey}` },
      model: getOpenAiModelId(model),
      prompt,
      systemPrompt,
      maxTokens,
    });
  }

  if (isOpenRouterModel(model)) {
    const apiKey = await getResolvedOpenRouterApiKey();
    if (!apiKey) throw new Error("Missing OpenRouter API key.");
    return callOpenAiCompatible({
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://llamacoder.app",
        "X-Title": "OneFlow Agents",
      },
      model: getOpenRouterModelId(model),
      prompt,
      systemPrompt,
      maxTokens,
    });
  }

  if (isNvidiaModel(model)) {
    const apiKey = await getResolvedNvidiaApiKey();
    if (!apiKey) throw new Error("Missing NVIDIA API key.");
    return callOpenAiCompatible({
      url: `${NVIDIA_API_BASE}/chat/completions`,
      headers: { Authorization: `Bearer ${apiKey}` },
      model: getNvidiaModelId(model),
      prompt,
      systemPrompt,
      maxTokens,
    });
  }

  if (isNovitaModel(model)) {
    const apiKey = await getResolvedNovitaApiKey();
    if (!apiKey) throw new Error("Missing Novita AI API key.");
    return callOpenAiCompatible({
      url: `${NOVITA_API_BASE}/chat/completions`,
      headers: { Authorization: `Bearer ${apiKey}` },
      model: getNovitaModelId(model),
      prompt,
      systemPrompt,
      maxTokens,
    });
  }

  if (isAnthropicModel(model)) {
    return callAnthropicWithSystem(
      getAnthropicModelId(model),
      prompt,
      systemPrompt,
      maxTokens,
    );
  }

  if (isGoogleModel(model)) {
    return callGoogleWithSystem(
      getGoogleModelId(model),
      prompt,
      systemPrompt,
      maxTokens,
    );
  }

  if (model === ONEMINI_MODEL_VALUE) {
    return callModelslabWithSystem(
      ONEMINI_MODEL_ID,
      prompt,
      systemPrompt,
      maxTokens,
    );
  }

  if (model.startsWith(MODELSLAB_PREFIX)) {
    return callModelslabWithSystem(
      model.slice(MODELSLAB_PREFIX.length),
      prompt,
      systemPrompt,
      maxTokens,
    );
  }

  throw new Error(`Unsupported agent model: ${model}`);
}

export async function generateAgentBuilderReply({
  prompt,
  model,
  plan,
  messages,
}: {
  prompt: string;
  model: string;
  plan: AgentPlan;
  messages: AgentBuilderMessage[];
}) {
  const content = await callBuilderModel({
    model,
    prompt: JSON.stringify({
      originalPrompt: prompt,
      plan,
      conversation: messages.slice(-8),
    }),
  });

  if (!content.trim()) {
    logAgentEmptyFallback(
      "[agents] provider returned an empty builder reply; using fallback reply",
      model,
    );
    return getDefaultBuilderReply(prompt);
  }

  try {
    const parsed = parseModelJson(content) as { message?: unknown };
    return asString(parsed.message, getDefaultBuilderReply(prompt));
  } catch (error) {
    logAgentJsonParseFallback(
      "[agents] failed to parse builder reply JSON",
      error,
      content,
    );
    return getDefaultBuilderReply(prompt);
  }
}

export async function generatePublishedAgentSystemPrompt({
  title,
  prompt,
  model,
  plan,
  messages,
}: {
  title: string;
  prompt: string;
  model: string;
  plan: AgentPlan;
  messages: AgentBuilderMessage[];
}) {
  const content = await callBuilderModel({
    model,
    prompt: JSON.stringify({
      title,
      originalPrompt: prompt,
      plan,
      conversation: messages.slice(-24),
    }),
    systemPrompt: AGENT_PUBLISH_SYSTEM_PROMPT,
    maxTokens: 2200,
  });

  if (!content.trim()) {
    logAgentEmptyFallback(
      "[agents] provider returned an empty published agent prompt; using fallback prompt",
      model,
    );
    return getDefaultPublishedSystemPrompt({ title, prompt, plan, messages });
  }

  let systemPrompt = "";

  try {
    const parsed = parseModelJson(content) as { systemPrompt?: unknown };
    systemPrompt = asString(parsed.systemPrompt, "");
  } catch (error) {
    logAgentJsonParseFallback(
      "[agents] failed to parse published prompt JSON",
      error,
      content,
    );
  }

  if (!systemPrompt) {
    return getDefaultPublishedSystemPrompt({ title, prompt, plan, messages });
  }

  return improveGeneratedPublishedSystemPrompt(systemPrompt);
}

export async function generateAgentTestReply({
  systemPrompt,
  model,
  message,
  channelName,
  maxTokens = 2000,
}: {
  systemPrompt: string;
  model: string;
  message: string;
  channelName: string;
  maxTokens?: number;
}) {
  const testSystemPrompt = removeTestBlockingGuardrails(systemPrompt);
  const content = await callBuilderModel({
    model,
    prompt: JSON.stringify({
      channel: channelName,
      testMessage: message,
    }),
    systemPrompt: `${testSystemPrompt}\n\n${AGENT_TEST_RESPONSE_FORMAT_PROMPT}`,
    maxTokens,
  });

  if (!content.trim()) {
    logAgentEmptyFallback(
      "[agents] provider returned an empty test reply; using fallback reply",
      model,
    );
    return getDefaultTestReply({ message, channelName });
  }

  try {
    const parsed = parseModelJson(content);
    const reply = getMessageFromTestReply(parsed);
    if (reply) return reply;
  } catch {
    const trimmed = content.trim();
    const reply = getMessageFromTestReply(trimmed);
    if (reply) return reply;
  }

  logAgentEmptyFallback(
    "[agents] provider returned an invalid test reply; using fallback reply",
    model,
  );
  return getDefaultTestReply({ message, channelName });
}
