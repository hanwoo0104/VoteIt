import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const defaults = {
  phone: "010-1234-5678",
  password: "voteit1234!",
  role: "user",
  name: "테스트사용자",
  nickname: "테스트시민",
  gender: "other",
  ageGroup: "30대",
  region: "서울",
  incomeLevel: "200-400만원"
};

function loadEnvFile(fileName) {
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const [key, value = "true"] = raw.slice(2).split("=");
    args[key] = value;
  }
  return args;
}

function normalizePhone(phone) {
  return phone.replace(/[^\d]/g, "");
}

function phoneToAuthEmail(phone) {
  const normalized = normalizePhone(phone);
  if (!/^01\d{8,9}$/.test(normalized)) {
    throw new Error("Invalid Korean mobile phone number.");
  }
  return `${normalized}@phone.voteit.local`;
}

function assertRole(role) {
  if (!["user", "politician", "admin"].includes(role)) {
    throw new Error("--role must be one of user, politician, admin.");
  }
}

function isMissingRow(error) {
  return error?.code === "PGRST116";
}

function isMissingAuthUser(error) {
  return /not found|does not exist/i.test(error?.message ?? "");
}

async function cleanupExistingAccount(admin, account, normalizedPhone) {
  const { data: existingUser, error: lookupError } = await admin
    .from("users")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (lookupError && !isMissingRow(lookupError)) throw lookupError;

  if (existingUser?.id) {
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(existingUser.id);
    if (deleteAuthError && !isMissingAuthUser(deleteAuthError)) {
      console.warn(`Could not delete previous auth user: ${deleteAuthError.message}`);
    }
  }

  const { error: profileDeleteError } = await admin
    .from("profiles")
    .delete()
    .eq("nickname", account.nickname);

  if (profileDeleteError) throw profileDeleteError;

  const { error: userDeleteError } = await admin
    .from("users")
    .delete()
    .eq("phone", normalizedPhone);

  if (userDeleteError) throw userDeleteError;
}

function buildRecoveryMessage(error) {
  const message = error?.message ?? String(error);

  if (/Database error finding users?|User already registered|already been registered/i.test(message)) {
    return [
      message,
      "",
      "Recovery:",
      "1. Supabase SQL Editor에서 supabase/fix-auth-trigger.sql 내용을 다시 실행하세요.",
      "2. auth.users에 직접 insert했던 계정이 남아 있으면 그 SQL이 삭제합니다.",
      "3. 그 다음 npm run seed:demo-user 또는 npm run seed:admin-user 를 다시 실행하세요."
    ].join("\n");
  }

  return message;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const args = parseArgs(process.argv.slice(2));
  const account = {
    ...defaults,
    phone: args.phone ?? defaults.phone,
    password: args.password ?? defaults.password,
    role: args.role ?? defaults.role,
    name: args.name ?? defaults.name,
    nickname: args.nickname ?? defaults.nickname,
    gender: args.gender ?? defaults.gender,
    ageGroup: args["age-group"] ?? defaults.ageGroup,
    region: args.region ?? defaults.region,
    incomeLevel: args["income-level"] ?? defaults.incomeLevel
  };

  assertRole(account.role);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const normalizedPhone = normalizePhone(account.phone);
  const email = phoneToAuthEmail(account.phone);

  await cleanupExistingAccount(admin, account, normalizedPhone);

  const metadata = {
    phone: normalizedPhone,
    role: account.role,
    name: account.name,
    nickname: account.nickname,
    gender: account.gender,
    age_group: account.ageGroup,
    region: account.region,
    income_level: account.incomeLevel
  };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: account.password,
    email_confirm: true,
    user_metadata: metadata
  });

  if (createError) throw new Error(buildRecoveryMessage(createError));
  if (!created.user) throw new Error("Supabase did not return a created user.");

  const { error: userError } = await admin.from("users").upsert({
    id: created.user.id,
    phone: normalizedPhone,
    role: account.role
  });

  if (userError) throw userError;

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    name: account.name,
    nickname: account.nickname,
    gender: account.gender,
    age_group: account.ageGroup,
    region: account.region,
    income_level: account.incomeLevel
  });

  if (profileError) throw profileError;

  console.log("VoteIt account created.");
  console.log(`Phone: ${account.phone}`);
  console.log(`Password: ${account.password}`);
  console.log(`Role: ${account.role}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
