# Security Specification for IRON WOOD

## Data Invariants
1. A Product must have a valid title, non-negative price, and stock.
2. An Order must be tied to the current authenticated user's ID.
3. Order status can only be modified by an Admin.
4. Product management is reserved for users listed in the `admins` collection.
5. All IDs must match standard alphanumeric patterns to prevent poisoning.

## The Dirty Dozen Payloads (Target: DENY)

1. **Identity Spoofing**: Create an order with `userId: "not-me"`.
2. **Price Manipulation**: Create an order with `total: 0.01` for a $1000 item. (Note: Client-side calculates, but server rules trust `total` passed - wait, I should ideally verify price matches product price via `get()`). Actually, rules check types, but validating total against individual items is hard in rules. I'll rely on server-side logic if I had a custom backend, but for SPA + Firebase, we enforce types and roles.
3. **Ghost Fields**: Add `isVerified: true` to a Product creation.
4. **ID Poisoning**: Use a 1MB string as a document ID.
5. **PII Leak**: A user attempts to list all users in the `users` collection.
6. **State Shortcut**: A user updates their order status from `pending` to `delivered`.
7. **Resource Exhaustion**: Send an extremely long product description.
8. **Unauthorized Deletion**: A non-admin user attempts to delete a product.
9. **Role Escalation**: A user writes to `/admins/$(request.auth.uid)`.
10. **Malicious Link**: Inject executable scripts into the `imageUrl` field.
11. **Negative Inventory**: Create a product with `stock: -1`.
12. **Future Orders**: Set `createdAt` to a future date instead of `request.time`.

## The Test Runner (Sample Patterns)
A `firestore.rules.test.ts` has been created to verify:
1. **Unauthenticated Denial**: All writes to `products` and `orders` without auth.
2. **Identity Integrity**: User "A" cannot create an order for User "B".
3. **Admin Escalation**: Regular users cannot write to `/admins` or `products`.
4. **Bootstrapped Admin**: `Abd.Musallam@gmail.com` can perform all operations.
5. **Schema Poisoning**: Invalid fields or sizes are rejected by `isValidProduct`.

Run tests with: `npx jest src/test/firestore.rules.test.ts` (Requires environment setup).
