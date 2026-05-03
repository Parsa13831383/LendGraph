# LendGraph

> The Heartbeat of Private Credit Infrastructure.

LendGraph is an end-to-end private credit engine designed to turn fragmented operational workflows into structured underwriting intelligence. It provides bridge lenders with deep portfolio visibility and gives investors direct exposure to real-time capital allocation performance.

![LendGraph Portfolio Overview](Screenshot%202026-05-03%20at%2021.11.03.jpg)

## 🎯 Project Vision
In private credit, data is often trapped in PDFs and siloed spreadsheets. LendGraph solves this by:
* **Structuring Data:** Converting operational debt workflows into proprietary data models.
* **Real-time Monitoring:** Automating covenant tracking to identify risks before they become defaults.
* **Investor Transparency:** Providing a live window into funder portfolio intelligence and drawdown history.

## 🛠️ Tech Stack & Architecture
This project is built to mirror kennek's production environment, focusing on reliability and scalability.

* **Backend:** Kotlin (Spring Boot) — Built with a focus on strong types and financial precision.
* **Database:** PostgreSQL — Relational modeling for complex loan-to-investor capital allocation.
* **Frontend:** React + TypeScript — High-density dashboards featuring custom financial data visualizations.
* **Testing:** 100+ automated tests (unit and E2E) across core modules to ensure calculation integrity.

## 🚀 Key Modules

### 1. Automated Underwriting & Covenants
* **Smart Breach Detection:** The system automatically flags status changes when thresholds are met, such as the **70% LTV breach** observed at **Brighton Marina Ventures**.
* **ICR Monitoring:** Real-time tracking of Interest Coverage Ratios to protect investor capital.

### 2. AI-Native Document Extraction
* **OCR Term Extraction:** Upload loan facility agreements to extract key data points (LTV, Interest, Principal) via an AI-powered pipeline.
* **Automated Onboarding:** Reducing the time-to-production for new loan originations.

### 3. Investor Intelligence
* **Capital Allocation Engine:** Granular view of commitment vs. drawn amount across diverse portfolios.
* **Drawdown Audit Trails:** Immutable history of recent capital movements for C-suite reporting.

### 4. Third-Party Connectivity
* Pre-built integration status monitoring for **Xero**, **Companies House**, **Credit Safe**, and **Land Registry**.

## 🏗️ Deployment & CI/CD
* **Continuous Delivery:** Automated pipelines with staged rollouts.
* **Infrastructure:** Deployed in a cloud environment using backwards-compatible migration practices.

---
*Built for the kennek Product Engineering Team.*
