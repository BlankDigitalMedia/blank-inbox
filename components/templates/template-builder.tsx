"use client"

import { Puck, type Data } from "@measured/puck"
import "@measured/puck/puck.css"
import "./puck-overrides.css"
import { useCallback, useEffect, useMemo } from "react"
import { ensureTemplateContentIds } from "@/lib/template-utils"
import { emailTemplateConfig } from "./email-config"

type TemplateBuilderProps = {
  value: Data
  onChange?: (data: Data) => void
  onPublish?: (data: Data) => void
}



export const defaultTemplateData: any = {
  root: {
    props: {
      subject: "",
      preheader: "",
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

export function TemplateBuilder({ value, onChange, onPublish }: TemplateBuilderProps) {
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
