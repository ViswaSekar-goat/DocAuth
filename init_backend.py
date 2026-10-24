import os

dirs = [
    "backend/app",
    "backend/app/api",
    "backend/app/api/endpoints",
    "backend/app/core",
    "backend/app/forensics",
    "backend/app/models",
    "backend/app/schemas",
    "backend/app/services",
    "backend/worker",
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "__init__.py"), "w") as f:
        pass

print("Backend structure initialized.")
