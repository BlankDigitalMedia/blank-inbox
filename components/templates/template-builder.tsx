"use client"

import { Puck, type Config, type Data } from "@measured/puck"
import "@measured/puck/puck.css"
import "./puck-overrides.css"
import { Heading, Text, Section, Button as EmailButton, Img, Hr } from "@react-email/components"
import { useCallback, useEffect, useMemo } from "react"
import { ensureTemplateContentIds } from "@/lib/template-utils"

type TemplateBuilderProps = {
  value: Data
  onChange?: (data: Data) => void
  onPublish?: (data: Data) => void
}

const emailTemplateConfig = {
  root: {
    label: "Email",
    fields: {
      backgroundColor: {
        type: "text",
        label: "Page background",
        defaultValue: "#f4f4f5",
      },
      contentBackground: {
        type: "text",
        label: "Content background",
        defaultValue: "#ffffff",
      },
      contentWidth: {
        type: "number",
        label: "Content width",
        defaultValue: 600,
        min: 320,
        max: 800,
        step: 10,
      },
      outerPadding: {
        type: "number",
        label: "Outer padding",
        defaultValue: 32,
        min: 0,
        max: 64,
        step: 4,
      },
    },
    render: ({ children, backgroundColor, contentBackground, contentWidth, outerPadding }) => {
      const width = typeof contentWidth === "number" ? contentWidth : Number(contentWidth) || 600
      const padding = typeof outerPadding === "number" ? outerPadding : Number(outerPadding) || 32

      return (
        <div
          style={{
            backgroundColor: backgroundColor || "#f4f4f5",
            padding: `${padding}px`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: `${width}px`,
              backgroundColor: contentBackground || "#ffffff",
              borderRadius: 12,
              overflow: "hidden",
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            {children}
          </div>
        </div>
      )
    },
  },
  components: {
    Hero: {
      label: "Hero",
      fields: {
        eyebrow: {
          type: "text",
          label: "Eyebrow",
          defaultValue: "New feature",
        },
        headline: {
          type: "text",
          label: "Headline",
          defaultValue: "Create beautiful emails in minutes",
        },
        description: {
          type: "textarea",
          label: "Description",
          defaultValue: "Build branded marketing emails with our drag-and-drop editor powered by React Email.",
        },
        buttonText: {
          type: "text",
          label: "Button text",
          defaultValue: "Get started",
        },
        buttonUrl: {
          type: "text",
          label: "Button URL",
          defaultValue: "https://example.com",
        },
        imageUrl: {
          type: "text",
          label: "Image URL",
          defaultValue: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop",
        },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
          defaultValue: "center",
        },
      },
      render: ({ eyebrow, headline, description, buttonText, buttonUrl, imageUrl, align }) => (
        <Section
          style={{
            padding: "48px 48px 40px",
            textAlign: align === "left" ? "left" : "center",
          }}
        >
          {imageUrl ? (
            <div style={{ marginBottom: 24 }}>
              <Img
                src={imageUrl}
                alt={headline || "Hero"}
                width="100%"
                style={{ borderRadius: 12, maxWidth: 480, width: "100%", margin: "0 auto" }}
              />
            </div>
          ) : null}
          {eyebrow ? (
            <Text style={{ textTransform: "uppercase", letterSpacing: "0.08em", color: "#6366f1", fontSize: 12, marginBottom: 12 }}>
              {eyebrow}
            </Text>
          ) : null}
          {headline ? (
            <Heading as="h1" style={{ fontSize: 32, lineHeight: "40px", fontWeight: 700, marginBottom: 16 }}>
              {headline}
            </Heading>
          ) : null}
          {description ? (
            <Text style={{ fontSize: 16, lineHeight: "26px", color: "#4b5563", margin: "0 auto 24px", maxWidth: 480 }}>
              {description}
            </Text>
          ) : null}
          {buttonText ? (
            <EmailButton
              href={buttonUrl || "#"}
              style={{
                backgroundColor: "#4338ca",
                color: "#ffffff",
                fontSize: 16,
                borderRadius: 9999,
                padding: "14px 28px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {buttonText}
            </EmailButton>
          ) : null}
        </Section>
      ),
    },
    HeadingBlock: {
      label: "Heading",
      fields: {
        text: {
          type: "text",
          label: "Text",
          defaultValue: "A standout headline",
        },
        level: {
          type: "select",
          label: "Level",
          options: [
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
          ],
          defaultValue: "h2",
        },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
          defaultValue: "left",
        },
      },
      render: ({ text, level, align }) => (
        <Section style={{ padding: "0 48px 16px" }}>
          <Heading
            as={level === "h3" ? "h3" : "h2"}
            style={{
              fontSize: level === "h3" ? 22 : 26,
              lineHeight: level === "h3" ? "30px" : "34px",
              fontWeight: 700,
              marginBottom: 12,
              textAlign: align === "center" ? "center" : "left",
            }}
          >
            {text}
          </Heading>
        </Section>
      ),
    },
    TextBlock: {
      label: "Text",
      fields: {
        content: {
          type: "textarea",
          label: "Content",
          defaultValue:
            "Share product updates, upcoming events, or onboarding guidance with flexible formatting and polished typography.",
        },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
          defaultValue: "left",
        },
      },
      render: ({ content, align }) => (
        <Section style={{ padding: "0 48px 24px" }}>
          <Text style={{ fontSize: 16, lineHeight: "26px", color: "#4b5563", textAlign: align || "left" }}>{content}</Text>
        </Section>
      ),
    },
    ButtonBlock: {
      label: "Button",
      fields: {
        text: {
          type: "text",
          label: "Label",
          defaultValue: "Call to action",
        },
        url: {
          type: "text",
          label: "URL",
          defaultValue: "https://example.com",
        },
        variant: {
          type: "radio",
          label: "Style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Outline", value: "outline" },
          ],
          defaultValue: "primary",
        },
        align: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
          defaultValue: "center",
        },
      },
      render: ({ text, url, variant, align }) => {
        const primaryStyles = {
          backgroundColor: "#4338ca",
          color: "#ffffff",
          border: "1px solid #4338ca",
        }

        const outlineStyles = {
          backgroundColor: "transparent",
          color: "#4338ca",
          border: "1px solid #4338ca",
        }

        return (
          <Section style={{ padding: "0 48px 32px", textAlign: align === "left" ? "left" : "center" }}>
            <EmailButton
              href={url || "#"}
              style={{
                fontSize: 16,
                borderRadius: 9999,
                padding: "14px 28px",
                textDecoration: "none",
                display: "inline-block",
                ...(variant === "outline" ? outlineStyles : primaryStyles),
              }}
            >
              {text || "Click here"}
            </EmailButton>
          </Section>
        )
      },
    },
    SpacerBlock: {
      label: "Spacer",
      fields: {
        height: {
          type: "number",
          label: "Height",
          defaultValue: 24,
          min: 8,
          max: 96,
          step: 4,
        },
      },
      render: ({ height }) => (
        <div style={{ height: typeof height === "number" ? height : Number(height) || 24 }} aria-hidden="true" />
      ),
    },
    DividerBlock: {
      label: "Divider",
      fields: {
        color: {
          type: "text",
          label: "Color",
          defaultValue: "#e4e4e7",
        },
      },
      render: ({ color }) => (
        <Section style={{ padding: "0 48px" }}>
          <Hr style={{ borderColor: color || "#e4e4e7", margin: "12px 0" }} />
        </Section>
      ),
    },
    Footer: {
      label: "Footer",
      fields: {
        content: {
          type: "textarea",
          label: "Content",
          defaultValue: "You're receiving this email because you signed up for updates. Unsubscribe anytime.",
        },
      },
      render: ({ content }) => (
        <Section style={{ padding: "32px 48px", backgroundColor: "#f9fafb" }}>
          <Text style={{ fontSize: 14, lineHeight: "20px", color: "#6b7280", textAlign: "center" }}>{content}</Text>
        </Section>
      ),
    },
  },
} satisfies Config

export const defaultTemplateData: Data = {
  root: {
    props: {
      backgroundColor: "#f4f4f5",
      contentBackground: "#ffffff",
      contentWidth: 600,
      outerPadding: 32,
    },
  },
  content: [
    {
      type: "Hero",
      props: {
        id: "hero-block",
      },
    },
    {
      type: "HeadingBlock",
      props: {
        id: "heading-block",
        text: "What you can build",
        level: "h2",
      },
    },
    {
      type: "TextBlock",
      props: {
        id: "text-block",
        content: "Drag in reusable blocks, update copy instantly, and send polished messages to your audience without leaving Blank Inbox.",
      },
    },
    {
      type: "ButtonBlock",
      props: {
        id: "button-block",
        text: "Build your next campaign",
        url: "https://example.com",
        variant: "primary",
      },
    },
    {
      type: "Footer",
      props: {
        id: "footer-block",
      },
    },
  ],
}

export function TemplateBuilder({ value, onChange, onPublish, headerTitle }: TemplateBuilderProps) {
  const [normalizedValue, changed] = useMemo(() => ensureTemplateContentIds(value), [value])

  useEffect(() => {
    if (changed) {
      onChange?.(normalizedValue)
    }
  }, [changed, normalizedValue, onChange])

  const handleChange = useCallback(
    (next: Data) => {
      const [normalized] = ensureTemplateContentIds(next)
      onChange?.(normalized)
    },
    [onChange]
  )

  const handlePublish = useCallback(
    (next: Data) => {
      const [normalized] = ensureTemplateContentIds(next)
      onPublish?.(normalized)
    },
    [onPublish]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col h-full">
      <div className="puck-host min-h-0 flex-1 overflow-auto h-full">
        <Puck
          config={emailTemplateConfig}
          data={normalizedValue}
          onChange={handleChange}
          onPublish={handlePublish}
          overrides={{
            header: ({ children }) => <>{children}</>,
            headerActions: ({ children }) => <>{children}</>,
          }}
        />
      </div>
    </div>
  )
}

export type EmailTemplateConfig = typeof emailTemplateConfig
