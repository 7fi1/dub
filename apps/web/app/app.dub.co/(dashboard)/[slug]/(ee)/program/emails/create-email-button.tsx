"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  buttonVariants,
  Megaphone,
  useKeyboardShortcut,
  Workflow,
} from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CreateEmailButton() {
  const { slug: workspaceSlug } = useWorkspace();
  const router = useRouter();

  useKeyboardShortcut("c", () =>
    router.push(`/${workspaceSlug}/program/emails/new`),
  );

  return (
    <>
      <Link
        href={`/${workspaceSlug}/program/emails/new`}
        className={cn(
          buttonVariants({ variant: "primary" }),
          "flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm",
        )}
      >
        Create email
        <kbd
          className={cn(
            "hidden rounded px-2 py-0.5 text-xs font-light transition-all duration-75 md:inline-block",
            "bg-neutral-700 text-neutral-400 group-hover:bg-neutral-600 group-hover:text-neutral-300",
          )}
        >
          C
        </kbd>
      </Link>
    </>
  );
}

const emailTypes = [
  {
    type: "campaign",
    icon: Megaphone,
    name: "Campaign",
    description: "Sent once manually",
    colorClassName: "text-blue-700 bg-blue-100",
  },
  {
    type: "automation",
    icon: Workflow,
    name: "Automation",
    description: "Triggered by an event",
    colorClassName: "text-green-700 bg-green-100",
  },
];
