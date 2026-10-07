import { constants } from "node:fs";
import { open, mkdir, realpath, rename, rm, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const credentialSchema = z.object({
  version: z.literal(1),
  endpoint: z.url(),
  token: z.string().min(1),
  sessionId: z.string().min(1),
  expiresAt: z.number().finite(),
  scopes: z
    .array(z.enum(["orchestration:read", "orchestration:operate"]))
    .min(1),
  runtimeMode: z.enum([
    "approval-required",
    "auto-accept-edits",
    "auto",
    "full-access",
  ]),
});
export type Credential = z.infer<typeof credentialSchema>;

export class CredentialFile {
  readonly path: string;
  readonly repository: string;
  constructor(
    path: string,
    repository = fileURLToPath(new URL("../../", import.meta.url)),
  ) {
    this.path = path;
    this.repository = repository;
  }
  async checkPath() {
    if (!isAbsolute(this.path))
      throw new Error(
        "Credential path must be absolute and outside the repository.",
      );
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const directory = await realpath(dirname(this.path));
    const repo = await realpath(this.repository);
    const rel = relative(repo, directory);
    if (
      !rel ||
      (!rel.startsWith(".." + "/") && rel !== ".." && !isAbsolute(rel))
    ) {
      throw new Error("Credentials must stay outside the repository.");
    }
    const info = await stat(directory);
    if (info.mode & 0o077)
      throw new Error("Credential directory must have mode 0700.");
    return resolve(directory, this.path.slice(this.path.lastIndexOf("/") + 1));
  }
  async read(): Promise<Credential> {
    const path = await this.checkPath();
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.mode & 0o077)
        throw new Error("Credential file must have mode 0600.");
      return credentialSchema.parse(JSON.parse(await handle.readFile("utf8")));
    } finally {
      await handle.close();
    }
  }
  async write(credential: Credential) {
    const path = await this.checkPath();
    const temporary = `${path}.${randomUUID()}`;
    try {
      const handle = await open(temporary, "wx", 0o600);
      try {
        await handle.writeFile(
          JSON.stringify(credentialSchema.parse(credential)) + "\n",
        );
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, path);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
