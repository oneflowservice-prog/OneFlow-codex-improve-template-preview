"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type PublicContactFormProps = {
  type: "support" | "contact";
  ui: "default" | "siteliyo";
  submitLabel: string;
  title?: string;
  description?: string;
  className?: string;
  cardClassName?: string;
  fieldClassName?: string;
  textareaClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
  icon?: "arrow" | "send";
  subjectLabel?: string;
  subjectPlaceholder?: string;
  messagePlaceholder?: string;
  showNameField?: boolean;
};

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  company: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
  company: "",
};

export function PublicContactForm({
  type,
  ui,
  submitLabel,
  title,
  description,
  className,
  cardClassName,
  fieldClassName,
  textareaClassName,
  buttonClassName,
  labelClassName,
  icon = "send",
  subjectLabel = "Subject",
  subjectPlaceholder = "How can we help?",
  messagePlaceholder = "Write your message here...",
  showNameField = true,
}: PublicContactFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          type,
          ui,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; ok?: boolean }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not send your message.");
      }

      setForm(initialFormState);
      toast({
        title: type === "support" ? "Support request sent" : "Message sent",
        description:
          payload.message ||
          (type === "support"
            ? "Your support request was delivered."
            : "Your message was delivered."),
      });
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Could not send your message.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const Icon = icon === "arrow" ? ArrowRight : Send;

  return (
    <div className={className}>
      <div className={cardClassName}>
        {title ? <p className="text-lg font-medium text-inherit">{title}</p> : null}
        {description ? (
          <p className="mt-2 text-sm leading-7 opacity-70">{description}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={form.company}
            onChange={(event) =>
              setForm((current) => ({ ...current, company: event.target.value }))
            }
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          {showNameField ? (
            <label className="block">
              <span className={labelClassName}>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Your name"
                className={fieldClassName}
                required
              />
            </label>
          ) : null}

          <label className="block">
            <span className={labelClassName}>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@example.com"
              className={fieldClassName}
              required
            />
          </label>

          <label className="block">
            <span className={labelClassName}>{subjectLabel}</span>
            <input
              type="text"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              placeholder={subjectPlaceholder}
              className={fieldClassName}
              required
            />
          </label>

          <label className="block">
            <span className={labelClassName}>Message</span>
            <textarea
              rows={6}
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              placeholder={messagePlaceholder}
              className={textareaClassName || fieldClassName}
              required
            />
          </label>

          {error ? <p className="text-sm text-[#ffb7c0]">{error}</p> : null}

          <button type="submit" disabled={isSubmitting} className={buttonClassName}>
            {isSubmitting ? "Sending..." : submitLabel}
            <Icon className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
