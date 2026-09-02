Developer Machine
       ↓
GitHub
       ↓
CI/CD
       ↓
Docker
       ↓
Cloud
       ↓
MongoDB Atlas
       ↓
Production


Possible production architecture:



                    Internet
                       │
                       ▼
                ┌──────────────┐
                │   Frontend   │
                │ React/Vite   │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │   Backend    │
                │ Node/Express │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │   MongoDB    │
                │    Atlas     │
                └──────────────┘