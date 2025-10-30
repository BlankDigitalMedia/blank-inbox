import type { Data } from "@measured/puck"
import { Html, Head, Body, Preview, Section } from "@react-email/components"
import { render } from "@react-email/render"
import { emailTemplateConfig } from "../../components/templates/email-config"
import React from "react"

type EmailRootProps = {
  subject?: string
  preheader?: string
  backgroundColor?: string
  contentBackground?: string
  contentWidth?: number
  outerPadding?: number
}

type RenderEmailResult = {
  html: string
  text: string
  subject: string
  preheader: string
}

export async function renderEmail(data: Data): Promise<RenderEmailResult> {
  const rootProps = (data.root?.props || {}) as EmailRootProps
  const subject = rootProps.subject || ""
  const preheader = rootProps.preheader || ""
  const backgroundColor = rootProps.backgroundColor || "#f4f4f5"
  const contentBackground = rootProps.contentBackground || "#ffffff"
  const contentWidth = typeof rootProps.contentWidth === "number" ? rootProps.contentWidth : 600
  const outerPadding = typeof rootProps.outerPadding === "number" ? rootProps.outerPadding : 32

  // Build the content blocks
  const content = (data.content || []).map((block, index) => {
    const componentConfig = emailTemplateConfig.components[block.type as keyof typeof emailTemplateConfig.components]
    if (!componentConfig) return null

    const Component = componentConfig.render as React.ComponentType<any>
    return React.createElement(Component, { key: `block-${index}`, ...block.props })
  }).filter(Boolean)

  // Build the email tree for production (no rounded corners for email client safety)
  const emailTree = (
    <Html>
      <Head />
      {preheader && <Preview>{preheader}</Preview>}
      <Body style={{ margin: 0, background: backgroundColor, fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Section style={{ padding: outerPadding }}>
          <div
            style={{
              maxWidth: contentWidth,
              margin: "0 auto",
              background: contentBackground,
              borderRadius: 0, // No rounded corners for email clients
              overflow: "hidden",
            }}
          >
            {content}
          </div>
        </Section>
      </Body>
    </Html>
  )

  // Render to HTML and plain text
  const html = await render(emailTree, { pretty: true })
  const text = await render(emailTree, { plainText: true })

  return {
    html,
    text,
    subject,
    preheader,
  }
}
