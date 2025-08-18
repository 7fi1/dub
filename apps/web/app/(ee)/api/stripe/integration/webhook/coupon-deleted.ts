import { qstash } from "@/lib/cron";
import { sendEmail } from "@dub/email";
import DiscountDeleted from "@dub/email/templates/discount-deleted";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import type Stripe from "stripe";

// Handle event "coupon.deleted"
export async function couponDeleted(event: Stripe.Event) {
  const coupon = event.data.object as Stripe.Coupon;
  const stripeAccountId = event.account as string;

  const workspace = await prisma.project.findUnique({
    where: {
      stripeConnectId: stripeAccountId,
    },
    select: {
      id: true,
      slug: true,
      defaultProgramId: true,
      stripeConnectId: true,
    },
  });

  if (!workspace) {
    return `Workspace not found for Stripe account ${stripeAccountId}.`;
  }

  if (!workspace.defaultProgramId) {
    return `Workspace ${workspace.id} for stripe account ${stripeAccountId} has no programs.`;
  }

  const discounts = await prisma.discount.findMany({
    where: {
      programId: workspace.defaultProgramId,
      OR: [{ couponId: coupon.id }, { couponTestId: coupon.id }],
    },
    include: {
      partnerGroup: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!discounts.length) {
    return `Discount not found for Stripe coupon ${coupon.id}.`;
  }

  const discountIds = discounts.map((d) => d.id);
  const groupIds = discounts
    .map((d) => d.partnerGroup?.id)
    .filter(Boolean) as string[];

  await prisma.$transaction(async (tx) => {
    if (groupIds.length > 0) {
      await tx.partnerGroup.updateMany({
        where: {
          id: {
            in: groupIds,
          },
        },
        data: {
          discountId: null,
        },
      });
    }

    if (discountIds.length > 0) {
      await tx.programEnrollment.updateMany({
        where: {
          discountId: {
            in: discountIds,
          },
        },
        data: {
          discountId: null,
        },
      });

      await tx.discount.deleteMany({
        where: {
          id: {
            in: discountIds,
          },
        },
      });
    }
  });

  waitUntil(
    (async () => {
      const workspaceUsers = await prisma.projectUsers.findFirst({
        where: {
          projectId: workspace.id,
          role: "owner",
          user: {
            email: {
              not: null,
            },
          },
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (workspaceUsers) {
        const { user } = workspaceUsers;

        await sendEmail({
          subject: `${process.env.NEXT_PUBLIC_APP_NAME}: Discount has been deleted`,
          email: user.email!,
          react: DiscountDeleted({
            email: user.email!,
            coupon: {
              id: coupon.id,
            },
          }),
        });
      }

      Promise.allSettled([
        ...groupIds.map((groupId) =>
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              groupId,
            },
          }),
        ),
      ]);
    })(),
  );

  return `Stripe coupon ${coupon.id} deleted.`;
}
