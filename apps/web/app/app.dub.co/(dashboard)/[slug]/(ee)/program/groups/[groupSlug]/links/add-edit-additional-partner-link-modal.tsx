"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { AdditionalPartnerLink } from "@/lib/types";
import { MAX_ADDITIONAL_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import { Button, Input, Modal } from "@dub/ui";
import { CircleCheckFill } from "@dub/ui/icons";
import { cn, nanoid } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const URL_VALIDATION_MODES = [
  {
    value: "domain",
    label: "Any page",
    description: "Allows links to any page under this domain",
  },
  {
    value: "exact",
    label: "Single page",
    description: "Restricts links to this single destination URL",
  },
];

interface AddDestinationUrlModalProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  linkId?: string;
}

function AddDestinationUrlModalContent({
  setIsOpen,
  linkId,
}: AddDestinationUrlModalProps) {
  const { group } = useGroup();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const link =
    linkId && group?.additionalLinks
      ? group.additionalLinks.find((link) => link.id === linkId)
      : undefined;

  const { register, handleSubmit, watch, setValue } =
    useForm<AdditionalPartnerLink>({
      defaultValues: {
        id: link?.id || nanoid(),
        url: link?.url || "",
        urlValidationMode: link?.urlValidationMode || "domain",
      },
    });

  const [url, urlValidationMode] = watch(["url", "urlValidationMode"]);

  const onSubmit = async (data: AdditionalPartnerLink) => {
    if (!group) return;

    const currentAdditionalLinks = group.additionalLinks || [];

    if (linkId && !link) {
      toast.error("The destination URL you are trying to edit does not exist.");
      return;
    }

    // Check for duplicate URLs (excluding the current link being edited)
    const existingUrls = currentAdditionalLinks
      .filter((existingLink) => !link || existingLink.id !== link.id)
      .map((existingLink) => existingLink.url.toLowerCase());

    if (existingUrls.includes(data.url.toLowerCase())) {
      toast.error("This destination URL already exists.");
      return;
    }

    let updatedAdditionalLinks: AdditionalPartnerLink[];

    if (link) {
      // Editing existing link - find and replace the specific link by ID
      updatedAdditionalLinks = currentAdditionalLinks.map((existingLink) => {
        if (existingLink.id === link.id) {
          return {
            ...data,
            id: link.id,
          };
        }

        return existingLink;
      });
    } else {
      // Check if we're at the maximum number of additional links
      if (currentAdditionalLinks.length >= MAX_ADDITIONAL_PARTNER_LINKS) {
        toast.error(
          `You can only create up to ${MAX_ADDITIONAL_PARTNER_LINKS} additional destination URLs.`,
        );
        return;
      }

      // Creating new link
      updatedAdditionalLinks = [...currentAdditionalLinks, data];
    }

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: {
        additionalLinks: updatedAdditionalLinks,
      },
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        setIsOpen(false);
        toast.success(
          link
            ? "Destination URL updated successfully!"
            : "Destination URL added successfully!",
        );
      },
      onError: () => {
        toast.error("Failed to save destination URL. Please try again.");
      },
    });
  };

  const isEditing = !!link;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit destination URL" : "Add destination URL"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-800">
              Destination URL
            </label>
            <Input
              value={watch("url") || ""}
              onChange={(e) => setValue("url", e.target.value)}
              type="url"
              placeholder="https://dub.co"
              className="max-w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-800">
              Allowed link types
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {URL_VALIDATION_MODES.map((type) => {
                const isSelected = type.value === urlValidationMode;

                return (
                  <label
                    key={type.value}
                    className={cn(
                      "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600",
                      "hover:bg-neutral-50",
                      "transition-all duration-150",
                      isSelected &&
                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                    )}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      className="hidden"
                      {...register("urlValidationMode")}
                    />

                    <div className="flex grow flex-col text-sm">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-neutral-600">
                        {type.description}
                      </span>
                    </div>

                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        isSelected && "scale-100 opacity-100",
                      )}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {!link && (
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                required
              />
              <label
                htmlFor="conversionTracking"
                className="text-sm text-neutral-600"
              >
                I confirm that conversion tracking has been set up on this URL.{" "}
                <a
                  href="https://dub.co/docs/partners/quickstart"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-neutral-900 underline hover:text-neutral-700"
                >
                  Learn more
                </a>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            text={isEditing ? "Update destination URL" : "Add destination URL"}
            className="w-fit"
            disabled={!url || !urlValidationMode}
            loading={isSubmitting}
          />
        </div>
      </div>
    </form>
  );
}

export function AddDestinationUrlModal({
  isOpen,
  setIsOpen,
  linkId,
}: AddDestinationUrlModalProps & {
  isOpen: boolean;
}) {
  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <AddDestinationUrlModalContent setIsOpen={setIsOpen} linkId={linkId} />
    </Modal>
  );
}

export function useAddDestinationUrlModal(
  props: Omit<AddDestinationUrlModalProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    addDestinationUrlModal: (
      <AddDestinationUrlModal
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
