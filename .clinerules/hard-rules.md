# Hard rules
- Never read, print, or edit .dev.vars or any .env file.
- Never run `wrangler deploy`.
- Run `wrangler d1 migrations apply` only with `--local`. Never against remote.
- Never edit a migration file that is already applied. Add a new one.
- Never push to git unless told to.