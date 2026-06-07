import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const MAX_AVATAR_SIZE = 4 * 1024 * 1024;
const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

export async function saveAvatarFile(file: File, namespace = "profiles") {
  if (!file.size) throw new Error("업로드할 사진을 선택해 주세요.");
  if (file.size > MAX_AVATAR_SIZE) throw new Error("프로필 사진은 4MB 이하로 업로드해 주세요.");

  const extension = MIME_EXTENSION[file.type];
  if (!extension) throw new Error("jpg, png, webp, gif 형식의 이미지만 업로드할 수 있습니다.");

  const safeNamespace = namespace.replace(/[^a-z0-9_-]/gi, "") || "profiles";
  const directory = join(process.cwd(), "public", "uploads", safeNamespace);
  await mkdir(directory, { recursive: true });

  const fileName = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(directory, fileName), buffer);

  return `/uploads/${safeNamespace}/${fileName}`;
}
