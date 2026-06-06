import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const dbPath = resolve(process.cwd(), process.env.VOTEIT_SQLITE_PATH ?? "data/voteit.sqlite");

for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (existsSync(path)) {
    rmSync(path, { force: true });
  }
}

console.log("VoteIt SQLite DB reset.");
console.log("다음 앱 실행 또는 API 요청 시 data/voteit.sqlite가 자동 생성되고 시드 데이터가 들어갑니다.");

