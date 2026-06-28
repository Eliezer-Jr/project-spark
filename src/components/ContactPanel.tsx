import { useEffect, useRef, useState } from "react";
import { Building2, Loader2, MapPin, MessageCircle, Phone, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { db, type Conversation } from "@/lib/app-db";

export function ContactPanel({
  participantId,
  contextLabel,
  appointmentId,
  compact = false,
}: {
  participantId: string;
  contextLabel?: string;
  appointmentId?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async (quiet = false) => {
    if (!participantId) return;
    if (!quiet) setLoading(true);
    try {
      setConversation(await db.getConversation(participantId, appointmentId));
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : "Could not open chat.");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, [participantId, appointmentId]);

  useEffect(() => {
    if (!open) return;
    void load();
    const interval = window.setInterval(() => void load(true), 5_000);
    return () => window.clearInterval(interval);
  }, [open, participantId, appointmentId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length, open]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await db.sendMessage(participantId, body, appointmentId);
      setConversation((current) =>
        current ? { ...current, messages: [...current.messages, message] } : current,
      );
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Message was not sent.");
    } finally {
      setSending(false);
    }
  };

  const participant = conversation?.participant;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {participant?.phone && (
        <Button asChild size={compact ? "icon" : "sm"} variant="outline" className="gap-2">
          <a href={`tel:${participant.phone}`} aria-label={`Call ${participant.fullName}`}>
            <Phone className="h-4 w-4" />
            {!compact && "Call"}
          </a>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size={compact ? "icon" : "sm"} variant="outline" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {!compact && "Chat"}
          </Button>
        </DialogTrigger>
        <DialogContent className="flex h-[min(760px,92vh)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b bg-muted/30 p-5 text-left">
            <DialogTitle className="sr-only">Conversation</DialogTitle>
            <DialogDescription className="sr-only">
              Chat and shared contact information
            </DialogDescription>
            {participant ? (
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  src={participant.avatarUrl}
                  name={participant.fullName}
                  className="h-12 w-12"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{participant.fullName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {participant.specialization ||
                      (participant.role === "artisan" ? "Service professional" : "Customer")}
                  </p>
                </div>
                {participant.phone && (
                  <Button asChild size="icon" className="rounded-full">
                    <a href={`tel:${participant.phone}`} aria-label={`Call ${participant.fullName}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading contact…
              </div>
            )}
          </DialogHeader>

          {participant && (
            <div className="grid gap-2 border-b bg-card px-5 py-3 text-xs text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {participant.location || "Location not provided"}
              </span>
              <span className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                {contextLabel || participant.bio || "Connected through Artisan CRM"}
              </span>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-5 sm:px-6">
            {loading ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                <Loader2 className="mb-2 h-5 w-5 animate-spin" />
              </div>
            ) : conversation?.messages.length ? (
              <div className="space-y-3">
                {conversation.messages.map((message) => {
                  const mine = message.senderId === user?.id;
                  return (
                    <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                          mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border bg-card text-card-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/65" : "text-muted-foreground")}>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {mine && message.readAt ? " · Read" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-medium">Start the conversation</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Confirm scope, arrival details, or anything needed for this service.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-card p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                maxLength={2000}
                rows={1}
                className="max-h-28 min-h-11 resize-none"
                placeholder="Write a message…"
              />
              <Button size="icon" className="h-11 w-11 shrink-0" disabled={!draft.trim() || sending} onClick={() => void send()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Shared only between this customer and artisan.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
