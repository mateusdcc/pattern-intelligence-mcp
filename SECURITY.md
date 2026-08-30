# Security policy

## Supported versions

Until 1.0, only the latest release receives security fixes.

## Reporting

Do not open a public issue for a vulnerability. Send a private GitHub security advisory to the
repository owner with reproduction steps, affected versions, impact, and any proposed mitigation.

## Current security boundary

The first release is a local stdio server. It performs no network requests, executes no user-supplied
code, stores no credentials, and has no remote transport. Inputs are schema-validated and catalog
resources are read-only.

Clients still control what system details they send to the server. Avoid including secrets in design
cases, evidence, ADR titles, or incident descriptions.
