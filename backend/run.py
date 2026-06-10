import uvicorn
import argparse
import os

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=["primary", "backup"], default="primary")
    args = parser.parse_args()

    os.environ["ROLE"] = args.role

    port = 8000 if args.role == "primary" else 8001
    db_path = f"traffic_{args.role}.db"

    os.environ["PORT"] = str(port)
    os.environ["DB_PATH"] = db_path

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )