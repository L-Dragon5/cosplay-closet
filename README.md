# Cosplay Closet

A personal inventory for cosplay items: series, characters, outfit versions,
items and where they are stored. Bun + Elysia + MariaDB, React + Mantine.

## Development

```bash
bun install
cp .env.example .env    # point DB_* at a local MariaDB
bun run dev             # http://localhost:3000, HMR
bun test
bun run lint
```

## Running with Docker

`compose.yaml` runs the app and MariaDB 11.8 together. Uploaded images live in
the `uploads` volume, the database in `dbdata`, and backups in `./backups` on
the host.

```bash
cp .env.example .env && $EDITOR .env   # MYSQL_ROOT_PASSWORD (alphanumeric)
docker compose up -d --build           # http://<host>:3000
```

`scripts/docker-smoke.sh` proves the image end to end in its own throwaway
project: build, healthcheck, upload an image, back up, wipe every volume,
restore, and get the same rows and bytes back. Run it after touching the
Dockerfile, `compose.yaml` or the backup scripts.

## Backup and restore

```bash
bun run backup                    # -> backups/cosplay-closet-<stamp>.tar.gz
bun run backup /path/out.tar.gz   # somewhere else, nothing pruned
bun run restore backups/<file>.tar.gz
```

In the stack, prefix with `docker compose exec -T app`. The archive holds
`db.sql` (a mysqldump, no `CREATE DATABASE`, so it restores under any database
name) and `uploads/` (every uploaded image).

- **Backup refuses a dump mysqldump did not sign off** ("Dump completed"), so a
  file on disk is always a usable one.
- **A default-path backup prunes `backups/`**: older than 30 days goes, unless it
  is one of the newest seven. Age is read from the file name. Files you named
  yourself are never touched.
- **Restore replaces, it does not merge.** It backs up what is there first and
  stops if that fails, then loads the database, then swaps the uploads, then
  prints row counts per table. A bad restore is undone with the printed
  `bun run restore <safety backup>`.
- `UPLOADS_DIR` overrides where images are read from and written to (default
  `public/uploads`), for a host that runs the app from another directory.
- The backups sit on the same disk as the data. Copy `backups/` somewhere else
  to survive a dead disk.

## Deploying with Komodo

Komodo clones the repo, writes `.env` from the Stack's Environment field, builds
and runs `docker compose up`. Stack settings:

| Setting | Value | Why |
| --- | --- | --- |
| Repo | `L-Dragon5/cosplay-closet`, branch `main` | public, so no `git_account` |
| `project_name` | `cosplay-closet` | volumes are `<project>_dbdata` / `_uploads`; renaming the Stack without this starts empty |
| Environment | `MYSQL_ROOT_PASSWORD`, optionally `PORT` | `PORT` is what NPM forwards to, default 3000 |
| `run_build` | **on** | the image builds from source; off means a redeploy reuses the old image |
| `reclone` | **off** | on deletes the folder every deploy, and `./backups` with it |
| `pre_deploy` | the backup below | a failed backup stops the deploy |
| `post_deploy` | `docker image prune -f` | every build leaves the old image behind |

```sh
[ -z "$(docker compose -p cosplay-closet ps --status running -q app)" ] || docker compose -p cosplay-closet exec -T app bun run backup
```

The guard skips the backup when no app container is running (the first
deploy, or a crash loop). Backups land in
`/etc/komodo/stacks/cosplay-closet/backups`.

**Deploy on push**, an Action on `Every 5 minutes` (Komodo is LAN-only, so no
webhook). It compares commits because the stack builds from source, and a push
that does not touch `compose.yaml` looks like "no changes" to `DeployStackIfChanged`:

```ts
// Komodo > Actions > deploy-cosplay-closet
const stack = "cosplay-closet";
await komodo.write("RefreshStackCache", { stack });
const { info } = await komodo.read("GetStack", { stack });
if (info.latest_hash && info.latest_hash !== info.deployed_hash) {
  console.log(`deploying ${info.deployed_hash} -> ${info.latest_hash}`);
  await komodo.execute_and_poll("DeployStack", { stack });
}
```

**Nightly backup**, an Action on `Every day at 03:00`, `failure_alert` on:

```ts
// Komodo > Actions > backup-cosplay-closet
let code = "";
await komodo.execute_stack_service_terminal(
  {
    stack: "cosplay-closet",
    service: "app",
    terminal: "nightly-backup",
    command: "bun run backup",
    init: { command: "sh", recreate: "Always" },
  },
  {
    onLine: (line) => console.log(line),
    onFinish: (c) => { code = c.trim(); },
  },
);
if (code !== "0") throw new Error(`backup exited ${code}`);
```

**Change `.env` in the Stack's Environment field, never on the server.** Komodo
rewrites it every deploy, and its pull runs `git checkout -f`, so a hand edit to
`compose.yaml` is also thrown away. A change to that file is a commit.

### Getting at the database

From `/etc/komodo/stacks/cosplay-closet`, after `export $(grep MYSQL_ROOT_PASSWORD .env)`:

```bash
docker compose -p cosplay-closet exec db mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" cosplay-closet
```

For a GUI client, the database publishes `127.0.0.1:3308` on the server only:
`ssh -N -L 3308:127.0.0.1:3308 you@homelab`, then connect to `127.0.0.1:3308`.

## Moving from the old binary install

One time, from the VM running the compiled `server` binary to the Komodo VM.

1. **Old VM.** Update the repo and stop the app so nothing changes mid-copy:
   ```bash
   cd <repo> && git pull && bun install
   # stop the binary (systemctl stop ..., or however it runs)
   UPLOADS_DIR=<dir the binary runs from>/public/uploads bun run backup
   mysql -N -B -e "select 'series',count(*) from series union all select 'characters',count(*) from characters union all select 'locations',count(*) from locations union all select 'items',count(*) from items union all select 'outfits',count(*) from outfits union all select 'outfit_items',count(*) from outfit_items" <DB_DATABASE>
   ```
   Keep the counts. `UPLOADS_DIR` can be left off if the binary runs from the repo.
2. **Copy the archive** to the Komodo VM:
   ```bash
   scp backups/cosplay-closet-<stamp>.tar.gz you@komodo-vm:/tmp/
   ssh you@komodo-vm 'sudo mkdir -p /etc/komodo/stacks/cosplay-closet/backups && sudo mv /tmp/cosplay-closet-*.tar.gz /etc/komodo/stacks/cosplay-closet/backups/'
   ```
   (If the Stack folder does not exist yet, do step 3 first.)
3. **Komodo.** Create the Stack with the settings above and Deploy. The first
   boot creates empty tables.
4. **Restore** on the Komodo VM:
   ```bash
   cd /etc/komodo/stacks/cosplay-closet
   docker compose -p cosplay-closet exec -T app bun run restore backups/cosplay-closet-<stamp>.tar.gz
   ```
   The printed counts must match step 1, and "restored N upload(s)" must match
   `find <uploads dir> -type f | wc -l` on the old VM.
5. **Nginx Proxy Manager**: point the proxy host at `<Komodo VM IP>:3000`.
6. Leave the old VM's database and binary stopped, not deleted, until you have
   clicked around the new one.
