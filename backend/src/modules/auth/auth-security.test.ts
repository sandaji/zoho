/**
 * Regression tests for the auth security fixes:
 *   - no privilege escalation through the profile or registration endpoints
 *   - no hard-coded admin bootstrap credential
 *   - refresh tokens: separate key, rejected as access tokens and vice versa
 *
 * Run from backend/:   npm run test:unit
 *
 * These need no database. The "source guard" tests read the auth module's
 * source on purpose: they fail loudly if someone reintroduces one of the
 * specific holes, without having to boot Express and Prisma.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";

// jwt.ts refuses to load without JWT_SECRET, so set the secrets before importing it.
process.env.JWT_SECRET = "a".repeat(48);
process.env.JWT_REFRESH_SECRET = "b".repeat(48);

const { generateToken, verifyToken, generateRefreshToken, verifyRefreshToken } =
  await import("../../core/utils/jwt");
const { loginSchema, updateProfileSchema, refreshSchema } = await import(
  "./auth.validation"
);

const readSource = (relative: string): string =>
  fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const sampleAccessToken = () =>
  generateToken({
    userId: "user-1",
    email: "user@example.com",
    role: "cashier",
    roles: ["cashier"],
    branchId: null,
  } as any);

describe("refresh tokens", () => {
  test("a refresh token verifies and returns the user id", () => {
    const token = generateRefreshToken("user-1");
    assert.deepEqual(verifyRefreshToken(token), { userId: "user-1" });
  });

  test("a refresh token is not accepted as an access token", () => {
    assert.throws(() => verifyToken(generateRefreshToken("user-1")));
  });

  test("an access token is not accepted as a refresh token", () => {
    assert.throws(() => verifyRefreshToken(sampleAccessToken()));
  });

  test("an expired refresh token is rejected", () => {
    const expired = jwt.sign(
      { userId: "user-1", type: "refresh" },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: -10 },
    );
    assert.throws(() => verifyRefreshToken(expired));
  });

  test("a token signed with the refresh key but without the refresh type is rejected", () => {
    const untyped = jwt.sign({ userId: "user-1" }, process.env.JWT_REFRESH_SECRET!);
    assert.throws(() => verifyRefreshToken(untyped));
  });

  test("a tampered refresh token is rejected", () => {
    const token = generateRefreshToken("user-1");
    assert.throws(() => verifyRefreshToken(token.slice(0, -2) + "xx"));
  });
});

describe("auth request schemas", () => {
  test("profile update drops a client-supplied role", () => {
    assert.deepEqual(
      updateProfileSchema.parse({ name: "Jane", role: "admin" }),
      { name: "Jane" },
    );
  });

  test("profile update rejects a blank name", () => {
    assert.equal(updateProfileSchema.safeParse({ name: "   " }).success, false);
  });

  test("login requires both email and password", () => {
    assert.equal(loginSchema.safeParse({ email: "a@b.co" }).success, false);
    assert.equal(loginSchema.safeParse({ password: "x" }).success, false);
    assert.equal(
      loginSchema.safeParse({ email: "a@b.co", password: "x" }).success,
      true,
    );
  });

  test("refresh requires a refresh token", () => {
    assert.equal(refreshSchema.safeParse({}).success, false);
    assert.equal(refreshSchema.safeParse({ refreshToken: "" }).success, false);
    assert.equal(refreshSchema.safeParse({ refreshToken: "abc" }).success, true);
  });
});

describe("auth module source guards", () => {
  const routes = readSource("./routes.ts");
  const service = readSource("./services/auth.service.ts");
  const controller = readSource("./controllers/auth.controller.ts");

  test("there is no public register route", () => {
    assert.doesNotMatch(routes, /router\.\w+\(\s*["']\/register["']/);
  });

  test("the refresh route is not behind the access-token middleware", () => {
    assert.doesNotMatch(
      routes,
      /router\.post\(\s*["']\/refresh["']\s*,\s*authMiddleware/,
    );
  });

  test("login, profile and refresh validate their request bodies", () => {
    assert.match(routes, /["']\/login["'],\s*validateBody\(loginSchema\)/);
    assert.match(
      routes,
      /["']\/profile["'],\s*authMiddleware,\s*validateBody\(updateProfileSchema\)/,
    );
    assert.match(routes, /["']\/refresh["'],\s*validateBody\(refreshSchema\)/);
  });

  test("there is no hard-coded admin bootstrap credential", () => {
    assert.doesNotMatch(service, /password123/);
    assert.doesNotMatch(service, /DEFAULT_ADMIN/);
  });

  test("the self-service profile update never writes a role", () => {
    assert.doesNotMatch(service, /data\.role/);
    assert.doesNotMatch(
      controller,
      /updateUser\(\s*req\.user\.userId,\s*req\.body\s*\)/,
    );
  });

  test("registration never reads a role from the request", () => {
    assert.doesNotMatch(service, /const \{[^}]*\brole\b[^}]*\} = request/);
  });
});
