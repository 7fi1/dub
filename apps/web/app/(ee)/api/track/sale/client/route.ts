import { trackSale } from "@/lib/api/conversions/track-sale";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withPublishableKey } from "@/lib/auth/publishable-key";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { NextResponse } from "next/server";

// POST /api/track/sale/client – Track a sale conversion event on the client side
export const POST = withPublishableKey(
  async ({ req, workspace }) => {
    const body = await parseRequestBody(req);

    let {
      customerExternalId,
      paymentProcessor,
      invoiceId,
      amount,
      currency,
      metadata,
      eventName,
      leadEventName,
    } = trackSaleRequestSchema.parse(body);

    if (!customerExternalId) {
      throw new DubApiError({
        code: "bad_request",
        message: "customerExternalId is required",
      });
    }

    const response = await trackSale({
      customerExternalId,
      amount,
      currency,
      eventName,
      paymentProcessor,
      invoiceId,
      leadEventName,
      metadata,
      workspace,
      rawBody: body,
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
