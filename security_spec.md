# Security Specification - Cardápio Livre

## 1. Data Invariants
- A `Restaurant` can only be created by an authenticated user, who becomes the `ownerId`.
- A `Category` or `Product` can only be created/modified by the `ownerId` of the associated `Restaurant`.
- An `Order` can be created by anyone (public), but once created, it can only be updated by the `ownerId` of the restaurant (or a waiter, though for MVP we'll focus on the owner).
- `Orders` for a specific restaurant should be readable by the owner.
- Customers can read a `Restaurant`, its `Categories`, and `Products` if they have the restaurant ID or slug.
- Customers can only read their own `Order` if they have the specific order ID (we'll implement this via local storage or specific order tracking).

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. Creating a restaurant with a different user as `ownerId`.
2. Updating a restaurant's `ownerId`.
3. Creating a product for a restaurant the user doesn't own.
4. Deleting a restaurant by a non-owner.
5. Reading all orders of all restaurants by a customer.
6. Updating an order status as a customer.
7. Injecting extra fields in a product (e.g., `isVerified: true`).
8. Creating a product with negative price.
9. Creating an order with total mismatching the sum of products (Rules can't sum but we check types/presence).
10. Modifying `createdAt` on any document.
11. Reading PII of other restaurant owners.
12. Accessing administrative collections without auth.

## 3. Test Runner Concept
The tests will ensure:
- Unauthenticated users cannot write to `restaurants`, `categories`, `products`.
- Unauthenticated users CAN create an `Order`.
- Authenticated users can only manage their own `Restaurant` related data.
