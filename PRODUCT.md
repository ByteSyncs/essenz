# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Owners and employees of gastronomic businesses operating one or more branches. Employees use branch-scoped access to carry out day-to-day operations.

## Product Purpose

Essenz is a SaaS for gastronomic businesses. It helps teams operate their branches and gives owners and employees clear information about orders, products, payments, inventory, expenses, and cash.

## Positioning

The product's distinctive positioning has not yet been defined.

## Operating Context

The product is currently oriented toward Argentina. Branches operate independently and staff access is scoped to a branch. Orders contain item snapshots, timestamps, status, payment methods, and amounts.

## Capabilities and Constraints

- The web application is built with Astro and React islands, and uses Supabase for its database.
- Existing branch workflows include orders, cash register, menu, inventory, expenses, and statistics.
- The current staff access model identifies a staff account and branch, but does not attribute each sale to an individual employee.
- Errors shown to users must not expose raw database or infrastructure details.

## Brand Commitments

- Product name: Essenz.
- The interface and operational copy use Spanish for Argentina.

## Evidence on Hand

- The repository contains the current application, Supabase migrations, and development seed data.
- No customer testimonials, external benchmarks, or approved promotional claims were provided.

## Product Principles

- Keep operational data scoped to the correct branch.
- Make sales and payment amounts understandable and traceable.
- Give employees useful operational access without requiring unnecessary personal staff records.
- Show actionable, normalized errors without exposing database internals.
