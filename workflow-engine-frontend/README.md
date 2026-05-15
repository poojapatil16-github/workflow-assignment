# Workflow Engine Frontend

A modern, responsive React + TypeScript application for managing multi-tenant workflows, items, approvals, and delegations.

## Features

- **Workflow Builder**: Intuitive drag-and-drop interface for designing workflows with stable state and transition IDs.
- **Item Management**: Create and track items through their workflow lifecycle.
- **Approval System**: Structured approval flows (Single, All, Quorum) with rejection-based termination.
- **Delegation Management**: Delegate approval authority to other eligible users.
- **SLA Monitoring**: Real-time SLA breach detection and escalation support.
- **RBAC**: Role-based access control (Admin, Creator, Approver) with dynamic delegated permissions.
- **Responsive UI**: Built with Tailwind CSS and Radix UI components.

## Tech Stack

- **Framework**: React 18+
- **Language**: TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **HTTP Client**: Axios
- **Form Validation**: Zod + React Hook Form
- **Icons**: Lucide React
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 20.19+

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```   

2. Configure environment:
   Create a `.env` file in the `workflow-engine-frontend` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Docker Support

You can also run the frontend using Docker as part of the main project's `docker-compose.yml`.

   ```bash
   docker-compose up -d --build
   ```

## Project Structure

- `src/api`: API client and endpoint definitions.
- `src/components`: Reusable UI components.
- `src/hooks`: Custom React hooks for data fetching and logic.
- `src/layouts`: Main application layouts.
- `src/pages`: Feature-specific pages.
- `src/store`: Global state management using Zustand.
- `src/types`: TypeScript interfaces and Zod schemas.
