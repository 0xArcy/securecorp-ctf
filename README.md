# SecureCorp CTF Challenge

A realistic web vulnerability capture-the-flag (CTF) challenge designed for educational purposes.

## Overview
This repository contains the source code and deployment scripts for the "SecureCorp" Employee Portal. The goal is to identify vulnerabilities, exploit them, and retrieve a hidden flag on the server.

### Vulnerabilities Covered
- SQL Injection (Authentication Bypass)
- Unrestricted File Upload
- Remote Code Execution (RCE)

## Structure
- `src/`: PHP Source code for the vulnerability challenge.
- `deploy/`: Scripts to provisioning the environment (Ubuntu/Apache/MySQL).
- `docs/`: Instructions for students and solution guides for instructors.

## Deployment Instructions

### Prerequisites
- Ubuntu 20.04/22.04 (or similar Debian-based distro)
- Root privileges

### Installation
1. Clone this repository.
2. Navigate to the `deploy/` directory.
3. Run the setup script as root.

```bash
cd deploy
sudo chmod +x setup.sh
sudo ./setup.sh
```

4. Access the website at `http://localhost`.

## Documentation
- [Student Handout](docs/HANDOUT.md) - Briefing and hints.

## Disclaimer
This code is intentionally vulnerable. **DO NOT** deploy this on a public-facing server without strictly isolating it. It allows arbitrary code execution by design.
