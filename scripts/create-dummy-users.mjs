import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const dbPath = resolve(process.cwd(), process.env.VOTEIT_SQLITE_PATH ?? "data/voteit.sqlite");
const outDir = resolve(process.cwd(), "exports");
const workbookPath = join(outDir, "dummy-users.xlsx");

const genders = ["female", "male", "other"];
const ageGroups = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];
const regions = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const incomeLevels = ["200만원 미만", "200-400만원", "400-700만원", "700만원 이상", "밝히고 싶지 않음"];
const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const firstNames = ["민준", "서연", "도윤", "하린", "지후", "수아", "현우", "지민", "유준", "예린", "건우", "나윤", "시우", "다은", "준서", "채원", "태오", "유나", "서진", "하준"];

function normalizePhone(phone) {
  return phone.replace(/[^\d]/g, "");
}

function formatPhone(phone) {
  const digits = normalizePhone(phone);
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function now() {
  return new Date().toISOString();
}

function createSchemaIfNeeded(db) {
  db.exec(`
    pragma foreign_keys = on;
    pragma journal_mode = wal;

    create table if not exists users (
      id text primary key,
      phone text not null unique,
      password_hash text not null,
      role text not null default 'user',
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists profiles (
      id text primary key references users(id) on delete cascade,
      name text not null,
      nickname text not null unique,
      gender text not null default 'other',
      age_group text not null,
      region text not null,
      income_level text not null,
      avatar_url text,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );
  `);
}

function makeDummyUsers() {
  return Array.from({ length: 50 }).map((_, index) => {
    const number = index + 1;
    const name = `${lastNames[index % lastNames.length]}${firstNames[(index * 3) % firstNames.length]}`;
    const phone = `0100000${1000 + number}`;
    return {
      no: number,
      name,
      nickname: `더미시민${String(number).padStart(3, "0")}`,
      phone: formatPhone(phone),
      normalizedPhone: normalizePhone(phone),
      password: `demo${String(number).padStart(4, "0")}`,
      gender: genders[index % genders.length],
      ageGroup: ageGroups[index % ageGroups.length],
      region: regions[index % regions.length],
      incomeLevel: incomeLevels[index % incomeLevels.length]
    };
  });
}

function cleanupLegacyShortDummyPhones(db) {
  const legacyPhones = Array.from({ length: 50 }).map((_, index) => `0100000${String(index + 1).padStart(3, "0")}`);
  const legacyIds = legacyPhones
    .map((phone) => db.prepare("select id from users where phone = ?").get(phone)?.id)
    .filter(Boolean);

  for (const id of legacyIds) {
    db.prepare("delete from profiles where id = ?").run(id);
    db.prepare("delete from users where id = ?").run(id);
  }
}

function upsertDummyUser(db, user) {
  const existing = db.prepare("select id from users where phone = ?").get(user.normalizedPhone);
  const id = existing?.id ?? randomUUID();
  const timestamp = now();

  if (existing) {
    db.prepare("update users set password_hash = ?, role = 'user', updated_at = ? where id = ?").run(hashPassword(user.password), timestamp, id);
  } else {
    db.prepare("insert into users (id, phone, password_hash, role, created_at, updated_at) values (?, ?, ?, 'user', ?, ?)").run(
      id,
      user.normalizedPhone,
      hashPassword(user.password),
      timestamp,
      timestamp
    );
  }

  db.prepare(
    `insert into profiles (id, name, nickname, gender, age_group, region, income_level, avatar_url, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, null, ?, ?)
     on conflict(id) do update set
      name = excluded.name,
      nickname = excluded.nickname,
      gender = excluded.gender,
      age_group = excluded.age_group,
      region = excluded.region,
      income_level = excluded.income_level,
      updated_at = excluded.updated_at`
  ).run(id, user.name, user.nickname, user.gender, user.ageGroup, user.region, user.incomeLevel, timestamp, timestamp);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index) {
  let name = "";
  let number = index;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const cellRef = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
          return `<c r="${cellRef}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="8" customWidth="1"/>
    <col min="2" max="2" width="14" customWidth="1"/>
    <col min="3" max="3" width="18" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="5" width="14" customWidth="1"/>
    <col min="6" max="9" width="16" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

async function writeWorkbook(users) {
  await mkdir(outDir, { recursive: true });
  if (existsSync(workbookPath)) rmSync(workbookPath, { force: true });

  const tempDir = await mkdtemp(join(tmpdir(), "voteit-dummy-users-"));
  try {
    const rows = [
      ["번호", "이름", "닉네임", "전화번호", "비밀번호", "성별", "연령대", "지역", "소득 수준"],
      ...users.map((user) => [user.no, user.name, user.nickname, user.phone, user.password, user.gender, user.ageGroup, user.region, user.incomeLevel])
    ];

    mkdirSync(join(tempDir, "_rels"), { recursive: true });
    mkdirSync(join(tempDir, "xl", "_rels"), { recursive: true });
    mkdirSync(join(tempDir, "xl", "worksheets"), { recursive: true });

    writeFileSync(
      join(tempDir, "[Content_Types].xml"),
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
    );
    writeFileSync(
      join(tempDir, "_rels", ".rels"),
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    );
    writeFileSync(
      join(tempDir, "xl", "workbook.xml"),
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="dummy-users" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
    );
    writeFileSync(
      join(tempDir, "xl", "_rels", "workbook.xml.rels"),
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    );
    writeFileSync(
      join(tempDir, "xl", "styles.xml"),
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`
    );
    writeFileSync(join(tempDir, "xl", "worksheets", "sheet1.xml"), sheetXml(rows));

    execFileSync("zip", ["-qr", workbookPath, "[Content_Types].xml", "_rels", "xl"], { cwd: tempDir });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  createSchemaIfNeeded(db);

  const users = makeDummyUsers();
  db.exec("begin immediate");
  try {
    cleanupLegacyShortDummyPhones(db);
    for (const user of users) {
      upsertDummyUser(db, user);
    }
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  } finally {
    db.close();
  }

  await writeWorkbook(users);

  console.log(`더미 유저 ${users.length}개 생성/업데이트 완료`);
  console.log(`DB: ${dbPath}`);
  console.log(`Excel: ${workbookPath}`);
  console.log("");
  console.log("첫 계정 예시");
  console.log(`Phone: ${users[0].phone}`);
  console.log(`Password: ${users[0].password}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
