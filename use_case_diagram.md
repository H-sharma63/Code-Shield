```mermaid
usecaseDiagram
    title AI-Based Code Reviewer - Use Case Diagram

    actor Developer
    actor Admin

    rectangle "AI Code Reviewer System" {
        usecase "Manage Own Account (Authentication)" as UC1
        usecase "Manage Own Projects (CRUD with DB)" as UC2
        usecase "Write & Edit Code" as UC3
        usecase "Analyze Code (via AI)" as UC4
        usecase "Run Code (via Judge0)" as UC5
        usecase "Debug Code" as UC6
        usecase "View Analysis & Output (Real-time with Pusher)" as UC7

        usecase "Manage User Accounts" as UC8
        usecase "Manage All Projects" as UC9
        usecase "Manage System Errors" as UC10
    }

    Developer --> UC1
    Developer --> UC2
    Developer --> UC3
    Developer --> UC4
    Developer --> UC5
    Developer --> UC6
    Developer --> UC7

    Admin --> UC8
    Admin --> UC9
    Admin --> UC10

    UC1 ..> (Authentication Service) : uses
    UC2 ..> (Database) : uses
    UC4 ..> (AI Code Analyzer) : uses
    UC5 ..> (Code Execution Engine) : uses
    UC7 ..> (Real-time Service) : uses

    UC8 ..> (Authentication Service) : uses
    UC8 ..> (Database) : uses
    UC9 ..> (Database) : uses


    UC1 : As a Developer, I can register, log in, and manage my own account, handled by the Authentication Service.
    UC2 : As a Developer, I can create, read, update, and delete my own projects, with data stored in the Database.
    UC4 : As a Developer, I can submit code for AI analysis, leveraging the AI Code Analyzer.
    UC5 : As a Developer, I can execute code using the Code Execution Engine.
    UC7 : As a Developer, I can view real-time analysis results and code execution output, facilitated by the Real-time Service.

    UC8 : As an Admin, I can manage all user accounts (e.g., create, modify, delete users, reset passwords).
    UC9 : As an Admin, I can manage all projects in the system (e.g., view, modify, delete any project).
    UC10 : As an Admin, I can monitor and manage system-wide errors and logs.
```
