# MechanicWorkShop

[![.NET CI](https://github.com/SouF-X/MechanicWorkShop/actions/workflows/dotnet-ci.yml/badge.svg)](https://github.com/SouF-X/MechanicWorkShop/actions/workflows/dotnet-ci.yml)

MechanicWorkShop is a full-stack mechanic workshop management system built as a portfolio project to practice real-world application development.

The goal of this project was not only to build screens and CRUD operations, but to understand how a real business workflow works from backend to frontend: customers, vehicles, repair tasks, scheduling, work orders, technicians, invoices, payments, authentication, authorization, and dashboard reporting.

This project helped me learn and apply many concepts that were new to me, including Clean Architecture, CQRS with MediatR, Entity Framework Core, SQL Server relationships, authentication with JWT, role-based authorization, Docker, logging, observability, and frontend integration with an API.

---

## Features

- Customer management
- Vehicle management
- Repair task and parts management
- Technician / employee management
- Role-based access for Manager and Labor users
- Work order creation and scheduling
- Bay / spot assignment
- Labor assignment
- Work order state flow:
  - Scheduled
  - In Progress
  - Completed
  - Cancelled
- Repair task modification only while the work order is scheduled
- Invoice issuing for completed work orders
- Invoice payment tracking
- PDF invoice generation
- Dashboard with work order and invoice insights
- Real-time work order update notifications with SignalR
- Background cleanup for overdue bookings
- API documentation with Swagger / Scalar
- CI build using GitHub Actions

---

## Tech Stack

### Backend

- ASP.NET Core 9
- Entity Framework Core
- SQL Server
- ASP.NET Core Identity
- JWT Authentication
- MediatR / CQRS
- FluentValidation
- QuestPDF
- SignalR
- Serilog
- OpenTelemetry
- Prometheus
- Grafana
- Docker

### Frontend

- HTML
- CSS
- Vanilla JavaScript
- Fetch API

### DevOps / Tooling

- Git
- GitHub
- GitHub Actions CI
- Docker Compose

---

## Architecture

The solution follows a layered architecture:

```txt
MechanicShop.Domain
MechanicShop.Application
MechanicShop.Infrastructure
MechanicShop.Contracts
MechanicShop.Api
```

### Domain

Contains the core business entities and rules.

Examples:

- WorkOrder
- Invoice
- Customer
- Vehicle
- RepairTask
- Employee

### Application

Contains use cases, commands, queries, validation, DTOs, and interfaces.

Examples:

- CreateWorkOrderCommand
- UpdateWorkOrderStateCommand
- IssueInvoiceCommand
- GetInvoicesQuery

### Infrastructure

Contains database access, Identity, PDF generation, notifications, SignalR, and background services.

### API

Contains controllers, middleware, authentication setup, API versioning, OpenAPI documentation, and frontend static files.

---

## What I Learned

This project was a major learning project for me.

I learned not only how to write the code, but also why each part exists and how the pieces connect together.

Some of the main things I learned:

- How to structure a project using Clean Architecture
- How to separate business logic from infrastructure
- How CQRS and MediatR help organize application use cases
- How Entity Framework Core maps relationships between entities
- How to protect endpoints with authentication and authorization
- How to implement business rules in the domain layer
- How frontend pages communicate with backend APIs
- How to generate invoices and PDF files
- How to use Docker Compose for SQL Server and supporting services
- How CI works with GitHub Actions
- How to debug real workflow problems step by step

---

## Screenshots

Add screenshots here:

```txt
docs/screenshots/dashboard.png
docs/screenshots/work-orders.png
docs/screenshots/work-order-detail.png
docs/screenshots/invoices.png
```

Example:

```md
![Dashboard](docs/screenshots/dashboard.png)
```

---

## Running Locally

### Requirements

- .NET 9 SDK
- SQL Server
- Git
- Optional: Docker Desktop

### Clone the repository

```bash
git clone https://github.com/SouF-X/MechanicWorkShop.git
cd MechanicWorkShop
```

### Restore packages

```bash
dotnet restore MechanicShop.sln
```

### Build

```bash
dotnet build MechanicShop.sln
```

### Run the API

```bash
dotnet run --project src/MechanicShop.Api
```

The app will be available at the configured local URL.

---

## Demo Account

For local development, create a development settings file with a first manager account:

```json
{
  "FirstManager": {
    "FirstName": "Primary",
    "LastName": "Manager",
    "Email": "manager@localhost",
    "Password": "manager123"
  }
}
```

Demo login:

```txt
Email: manager@localhost
Password: manager123
```

---

## Docker

The project includes Docker support for:

- API
- SQL Server
- Seq
- Prometheus
- Grafana

Run:

```bash
docker compose up --build
```

---

## CI

This repository uses GitHub Actions to automatically build the project on every push to `main`.

The workflow runs:

```bash
dotnet restore
dotnet build
```

This helps make sure the project continues to build successfully.

---

## Project Status

This is a portfolio MVP project built for learning and demonstration purposes.

It is not presented as a production SaaS application, but as a complete learning project that demonstrates my ability to build a real-world full-stack business application.

---

## Future Improvements

- Add automated unit and integration tests
- Add more dashboard reports
- Improve seed / demo data
- Add deployment pipeline
- Add real email / SMS provider integration
- Add better error pages
- Add audit / history screen for work orders
- Improve mobile responsiveness
