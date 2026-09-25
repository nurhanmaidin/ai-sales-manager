"use client";

import { useState, useTransition } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import { addNoteAction, deleteNoteAction } from "@/server/crm-actions";

export interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
  author: string;
}

export function NotesPanel({
  notes,
  leadId,
  customerId,
}: {
  notes: NoteItem[];
  leadId?: string;
  customerId?: string;
}) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    startTransition(async () => {
      const result = await addNoteAction({ content, leadId, customerId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setContent("");
      toast.success("Note added");
    });
  }

  async function remove(id: string) {
    setDeletingId(id);
    const result = await deleteNoteAction(id);
    setDeletingId(null);
    if (!result.ok) toast.error(result.error);
    else toast.success("Note deleted");
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="note-content" className="sr-only">
          Add a note
        </label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note — site visit details, preferences, anything worth remembering…"
          rows={3}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(e);
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Ctrl + Enter to save</span>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            loading={pending}
            disabled={!content.trim()}
          >
            Save note
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
          <StickyNote className="size-4 shrink-0 text-subtle" aria-hidden />
          No notes yet. Notes are private to your team.
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="group rounded-lg border bg-canvas/60 px-4 py-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Avatar name={note.author} size="xs" />
                <span className="text-xs font-medium text-foreground">{note.author}</span>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={note.createdAt}
                  title={formatDateTime(note.createdAt)}
                >
                  {formatRelative(note.createdAt)}
                </time>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto size-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label="Delete note"
                  loading={deletingId === note.id}
                  onClick={() => remove(note.id)}
                >
                  {deletingId !== note.id && <Trash2 />}
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {note.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
