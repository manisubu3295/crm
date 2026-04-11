import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "../lib/socket.js";
import { useAuth } from "../lib/auth.js";

export function useSocket() {
  const { user, tenantId } = useAuth();
  const qc = useQueryClient();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || !tenantId || registered.current) return;
    registered.current = true;

    const socket = getSocket(tenantId, user.id);

    socket.on("lead:created", () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    });

    socket.on("lead:stage_changed", ({ leadId }: { leadId: string }) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
    });

    socket.on("task:overdue", ({ taskId }: { taskId: string }) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.warning("A task is overdue", { description: `Task ID: ${taskId}` });
    });

    socket.on("message:delivered", ({ leadId }: { leadId: string }) => {
      qc.invalidateQueries({ queryKey: ["comms", leadId] });
    });

    socket.on("message:replied", ({ leadId, body }: { leadId: string; body: string }) => {
      qc.invalidateQueries({ queryKey: ["comms", leadId] });
      toast.success("New reply received", { description: body.slice(0, 80) });
    });

    socket.on("sla:breached", ({ leadId }: { leadId: string }) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.error("SLA Breach", { description: `Lead ${leadId} has breached SLA` });
    });

    socket.on("notification", ({ message, severity }: { message: string; severity: string }) => {
      if (severity === "error") toast.error(message);
      else if (severity === "warning") toast.warning(message);
      else toast.info(message);
    });

    return () => { registered.current = false; };
  }, [user, tenantId, qc]);
}
