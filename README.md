# SecureCorp CTF Challenge

A realistic web vulnerability capture-the-flag (CTF) challenge designed for educational purposes.

## Overview

This repository contains the source code and deployment scripts for the "SecureCorp" Employee Portal. The goal is to identify vulnerabilities, exploit them, and retrieve a hidden flag on the server.

### Vulnerabilities Covered

* SQL Injection (Authentication Bypass)
* Unrestricted File Upload
* Remote Code Execution (RCE)

## Lab Architecture & Environment Setup

**This challenge requires a Virtual Lab with two separate Virtual Machines (VMs).**

Do not attempt to run and exploit this on a single machine. You must set up a "Victim" machine and an "Attacker" machine.

### 1. VM 1: The Victim (Target)

* **OS:** Ubuntu 20.04 / 22.04 LTS (or similar Debian-based distro).
* **Role:** Hosts the vulnerable web application.
* **Action:** You will run the deployment scripts here. Once deployed, you will **leave this machine running** and switch to your attacking machine.

### 2. VM 2: The Attacker

* **OS:** Kali Linux (Recommended) or Parrot OS.
* **Role:** The evaluation station. All scanning (Nmap), enumeration, and exploitation must originate from here.
* **Action:** This is your primary workspace. **DO NOT** use the Ubuntu VM to run attacks against itself.

### Network Configuration

Ensure both VMs are configured on the same network adapter setting (e.g., **NAT Network** or **Bridged Adapter**) so they can communicate.

* From your **Kali** machine, you must be able to ping the **Ubuntu** machine's IP address.

---

## Deployment Instructions (Run on VM 1 ONLY)

**Perform these steps on the Ubuntu (Victim) VM:**

1. Clone this repository.
2. Navigate to the `deploy/` directory.
3. Run the setup script as root.

```bash
cd deploy
sudo chmod +x setup.sh
sudo ./setup.sh

```

4. Verify the site is running by visiting `http://localhost` inside the Ubuntu VM.
5. Find the IP address of this VM using `ip a` or `ifconfig`. Note this IP (e.g., `192.168.x.x`).

---

## Evaluation Phase (Run on VM 2)

**Once deployment is complete, switch to your Kali Linux (Attacker) VM.**

1. Open your browser or terminal in Kali.
2. Target the IP address of the Ubuntu VM you noted earlier (e.g., `http://192.168.x.x`).
3. Begin your assessment.

**STRICT RULE: DO NOT USE UBUNTU FOR ATTACKING.**

* The Ubuntu environment is strictly for hosting the victim server.
* Any tools, scripts, or manual testing must be executed from Kali Linux targeting the Ubuntu IP.

---

## Structure

* `src/`: PHP Source code for the vulnerability challenge.
* `deploy/`: Scripts to provision the environment (Apache/MySQL).
* `docs/`: Instructions for students and solution guides for instructors.

## Documentation

* [Student Handout](docs/HANDOUT.md) - Briefing and hints.

## Disclaimer

This code is intentionally vulnerable. **DO NOT** deploy this on a public-facing server or bridge it to an insecure network. It allows arbitrary code execution by design.

---

### Would you like to add a troubleshooting section for common connectivity issues between the VMs?
