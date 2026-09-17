# `@hypit/credential-store-platform`

One CredentialStore that keeps each credential where its platform keeps credentials: the user's
login keychain or Credential Locker on macOS and Windows, and an owner-private file on a host that
has no such locker. A Profile written once therefore authenticates on Linux, macOS and Windows
without an author editing it, and `@hypit/credential-store-os`, `@hypit/credential-store-file` and
`@hypit/credential-store-env` stay selectable by name for anyone who wants one specific store.

## Select it

```json
{
  "credentials": {
    "platform": { "use": "@hypit/credential-store-platform" }
  },
  "endpoints": {
    "hypihub.default": {
      "use": "@hypit/provider-hypihub",
      "config": {
        "baseUrl": "https://hypit.ai",
        "apiKey": { "store": "platform", "key": "hypihub.oauth" }
      }
    }
  }
}
```

The Endpoint still owns its acquisition flow and the Store only persists the result:

```bash
hypit auth login hypihub.default --runtime <profile>
hypit auth status hypihub.default --runtime <profile>
hypit auth logout hypihub.default --runtime <profile>
```

## What it does not do

The choice is made once per host, from the platform the Runtime is running on. This is not a lookup
chain: a miss in one store never tries another, and no credential is migrated between them. A
credential stored in a locker stays in that locker; a credential stored in a file stays in that file.

## Configuration

- `path` selects the directory for the file fallback, resolved against the Host state root printed by
  `hypit paths`. The default is the same `credentials` directory `@hypit/credential-store-file` uses,
  so on a host without a locker, switching between the two Stores finds the credential already stored.
- `service` selects the locker service name. The OS Store's own default applies when it is absent.

## Storage on each platform

On macOS and Windows the credential is held by the platform locker, with exactly the rules of
`@hypit/credential-store-os`: it is encrypted and access-controlled by the operating system, and it
is not readable from another machine.

Everywhere else the credential is held by an owner-private document with exactly the rules of
`@hypit/credential-store-file`: unencrypted JSON, one document per key, directory mode `0700`, file
mode `0600`, outside the video project, and never enumerated or indexed. Filesystem path-length
limits apply to an overlong key, which fails rather than selecting another name. A damaged document
can be replaced by `auth login` or deleted by `auth logout` without decoding the old value.
