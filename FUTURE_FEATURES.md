# Future Features

Deferred features and enhancements tracked for future implementation.

---

## Billing Ownership Transfer on User Deletion

**Context**: When an admin deletes a user who is the sole member of an organization, we now cascade-delete the orphaned org and its companies. However, when Stripe billing is live, we need additional handling:

- Cancel `stripeSubscriptionId` for deleted orgs before removing them
- For multi-member orgs, transfer billing ownership to another member if the deleted user was the billing contact
- Surface billing impact warnings in the admin UI danger zone

**Blocked on**: Stripe integration going live

**Related code**: `src/app/api/admin/users/[id]/route.ts` (DELETE handler)
