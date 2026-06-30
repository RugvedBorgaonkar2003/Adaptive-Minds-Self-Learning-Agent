import os
import uvicorn

def main():
    print("=========================================")
    print("   Adaptive Minds: FASTAPI Backend       ")
    print("=========================================")
    port = int(os.environ.get("PORT", 8000))
    is_prod = "PORT" in os.environ
    print(f"Starting FastAPI server on http://0.0.0.0:{port} (prod={is_prod})")
    uvicorn.run("src.api_server:app", host="0.0.0.0", port=port, reload=not is_prod)

if __name__ == "__main__":
    main()
