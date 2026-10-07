# t3-linear-agent
Connect Linear agent delegation to a self-hosted T3 Code server.

Delegate an issue to T3 in Linear, run the work on your own server, and receive a
pull request for review. This repository currently contains the design documents;
the service has not been implemented.

- [Specification](docs/spec.md) defines the proposed first version and its acceptance criteria.
- [Research](docs/research.md) records the evidence, alternatives, and questions to resolve before implementation.
- [Implementation workflow](docs/implementation/README.md) defines the approved workstreams, review loop, and installation gates.
- [Starting prompt](docs/implementation/starter-prompt.md) hands the workflow to a fresh agent after the approved documents are committed and pushed.
