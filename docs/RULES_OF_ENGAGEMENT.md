# Rules of Engagement (RoE) - SecureCorp Assessment

**Document Date:** February 12, 2026  
**Client:** SecureCorp Inc.  
**Assessor:** [Your Name/Handle]

## 1. Executive Summary
This document outlines the authorized scope, rules, and boundaries for the penetration testing engagement against the SecureCorp Employee Portal (CTF Challenge). The goal is to identify vulnerabilities, specifically focusing on authentication bypass and remote code execution paths.

## 2. In-Scope Assets
The following assets are explicitly **authorized** for testing:
*   **Web Application**: The SecureCorp Employee Portal hosted at `http://localhost` (or the deployed IP address).
*   **Source Code**: The provided PHP files in the `src/` directory, including:
    *   `src/index.php`
    *   `src/dashboard_v2r1q.php`
    *   `src/profile_x8d9s.php` 
    *   `src/settings_b6n7m.php`
*   **Database**: The underlying `company_db` MySQL database interacting with the application.

## 3. Engagement Objectives
The primary objectives of this assessment are to demonstrate the following exploit chains:
1.  **Authentication Bypass**: Gain access to the protected `dashboard_v2r1q.php` without valid credentials (SQL Injection).
2.  **Remote Code Execution (RCE)**: Leverage the file upload functionality to execute arbitrary commands on the server.
3.  **Flag Retrieval**: Locate and read the `flag.txt` file stored on the system.

## 4. Rules & Restrictions
*   **DoS (Denial of Service)**: Stress testing or DoS attacks are **strictly prohibited**.
*   **Destructive Testing**: Avoid deleting critical system files or rendering the application unusable for other users.
*   **Scope Boundaries**: 
    *   Do not attack the host operating system outside the context of the web application exploitation (i.e., do not attack SSH unless explicitly instructed).
    *   Do not attack any other services running on the machine.

## 5. Authorized Techniques
*   SQL Injection (SQLi)
*   Arbitrary File Upload (Unrestricted)
*   Directory Enumeration/Traversal (in the context of finding hidden PHP files)
*   Brute-force attacks against the login form (Rate limiting is not enforced).

## 6. Access & Credentials
*   **User Role**: `user` / `123456` (Provided for low-level access testing).
*   **Admin Role**: To be obtained via exploitation.

---
**Approval:**  
This engagement is authorized by SecureCorp Management for educational and training purposes.
