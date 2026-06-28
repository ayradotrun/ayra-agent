# Contributing

Thank you for your interest in AYRA Agent.

## Development setup

1. Fork and clone the repository
2. Copy `.env.example` to `.env` and configure platform Postgres + secrets
3. Run:

```bash
npm install
npm run setup          # safe schema sync + seed (+ Python if available)
npm run db:verify      # confirm DATABASE_URL
```

4. Start in two terminals:

```bash
npm run dev            # web
npm run worker         # Telegram + cron
```

If setup warns about data loss on `db push`, use `npm run db:sync` — see [Troubleshooting — Install](./docs/troubleshooting.md#install--database-setup).

## Pull requests

- Keep PRs focused; one feature or fix per PR
- Run `npm run build` and `npm run lint` before submitting
- Update README or `docs/` if behavior, commands, or env vars change
- Follow existing TypeScript and UI patterns

## Code of conduct

Be respectful in issues and reviews. We reserve the right to remove contributions that harass or discriminate.

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
