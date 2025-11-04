"use client"

import { createContext, useCallback, useContext, useMemo, useReducer } from "react"
import type { Email } from "@/lib/types"

type DraftIntent = "new" | "reply" | "replyAll" | "forward"

type DraftWindow = {
  id: string
  intent: DraftIntent
  email?: Email
  threadId?: string
  minimized: boolean
  title?: string
  draftId?: string
}

type InlineReply = {
  threadId: string
  messageId: string
  intent: DraftIntent
  email: Email
}

type State = { 
  windows: DraftWindow[]
  activeId?: string
  inlineReply?: InlineReply
}

type Action =
  | { type: "OPEN"; payload: Omit<DraftWindow, "minimized"> }
  | { type: "CLOSE"; id: string }
  | { type: "MINIMIZE"; id: string; minimized: boolean }
  | { type: "FOCUS"; id: string }
  | { type: "UPDATE"; id: string; patch: Partial<Pick<DraftWindow, "title" | "draftId">> }
  | { type: "OPEN_INLINE"; payload: InlineReply }
  | { type: "CLOSE_INLINE" }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN": {
      const id = action.payload.id
      const email = action.payload.email
      let title = "New message"
      
      if (action.payload.intent === "new") {
        title = "New message"
      } else if (email?.subject) {
        const maxLen = 30
        const subject = email.subject.length > maxLen 
          ? email.subject.substring(0, maxLen) + "..." 
          : email.subject
        
        if (action.payload.intent === "forward") {
          title = subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`
        } else if (action.payload.intent === "replyAll") {
          title = subject.startsWith("Re:") ? subject : `Re: ${subject}`
        } else {
          title = subject.startsWith("Re:") ? subject : `Re: ${subject}`
        }
      } else {
        title = action.payload.intent === "forward"
          ? "Forward"
          : action.payload.intent === "replyAll"
          ? "Reply all"
          : "Reply"
      }
      
      const win: DraftWindow = { ...action.payload, title, minimized: false }
      return { windows: [...state.windows, win], activeId: id }
    }
    case "CLOSE":
      return {
        windows: state.windows.filter(w => w.id !== action.id),
        activeId: state.activeId === action.id ? undefined : state.activeId,
      }
    case "MINIMIZE":
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, minimized: action.minimized } : w
        ),
      }
    case "FOCUS":
      return { ...state, activeId: action.id }
    case "UPDATE":
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.id ? { ...w, ...action.patch } : w
        ),
      }
    case "OPEN_INLINE":
      return {
        ...state,
        inlineReply: action.payload,
      }
    case "CLOSE_INLINE":
      return {
        ...state,
        inlineReply: undefined,
      }
    default:
      return state
  }
}

type Ctx = {
  windows: DraftWindow[]
  activeId?: string
  inlineReply?: InlineReply
  openNew: () => string
  openReply: (email: Email) => string
  openReplyAll: (email: Email) => string
  openForward: (email: Email) => string
  openDraft: (email: Email) => string
  openInlineReply: (email: Email, intent: "reply" | "replyAll" | "forward") => void
  closeInlineReply: () => void
  minimize: (id: string, minimized: boolean) => void
  close: (id: string) => void
  focus: (id: string) => void
  update: (id: string, patch: Partial<Pick<DraftWindow, "title" | "draftId">>) => void
}

const ComposeContext = createContext<Ctx | null>(null)

function genId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { windows: [] })
  
  const open = useCallback(
    (intent: DraftIntent, email?: Email) => {
      const id = genId()
      dispatch({ type: "OPEN", payload: { id, intent, email, threadId: email?.threadId } })
      return id
    },
    []
  )
  
  const value = useMemo<Ctx>(() => {
    return {
      windows: state.windows,
      activeId: state.activeId,
      inlineReply: state.inlineReply,
      openNew: () => open("new"),
      openReply: (email) => open("reply", email),
      openReplyAll: (email) => open("replyAll", email),
      openForward: (email) => open("forward", email),
      openDraft: (email) => {
        const id = genId()
        dispatch({ 
          type: "OPEN", 
          payload: { 
            id, 
            intent: "new", 
            email, 
            threadId: email.threadId,
            title: email.subject || "New message",
            draftId: email.id
          } 
        })
        return id
      },
      openInlineReply: (email, intent) => {
        dispatch({
          type: "OPEN_INLINE",
          payload: {
            threadId: email.threadId || email.id,
            messageId: email.id,
            intent,
            email,
          },
        })
      },
      closeInlineReply: () => dispatch({ type: "CLOSE_INLINE" }),
      minimize: (id, minimized) => dispatch({ type: "MINIMIZE", id, minimized }),
      close: (id) => dispatch({ type: "CLOSE", id }),
      focus: (id) => dispatch({ type: "FOCUS", id }),
      update: (id, patch) => dispatch({ type: "UPDATE", id, patch }),
    }
  }, [state, open])
  
  return <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>
}

export function useCompose() {
  const ctx = useContext(ComposeContext)
  if (!ctx) throw new Error("useCompose must be used within ComposeProvider")
  return ctx
}
